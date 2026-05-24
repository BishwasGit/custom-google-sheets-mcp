const express = require("express");
const crypto = require("crypto");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
// Configure Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory token store (in production, use database)
const tokenStore = new Map();
const pkceStore = new Map();

// Google OAuth config
let oauth2Client = null;
try {
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || "",
    process.env.GOOGLE_CLIENT_SECRET || "",
    process.env.GOOGLE_REDIRECT_URI || ""
  );
} catch (error) {
  console.error("Warning: Could not initialize OAuth2 client:", error.message);
}

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Generate random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ========== OAuth Authorize Endpoint ==========
app.get("/oauth/authorize", (req, res) => {
  try {
    const { code_challenge, code_challenge_method, state, resource } = req.query;

    if (!code_challenge || !state) {
      return res.status(400).json({ error: "Missing code_challenge or state" });
    }

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error("Missing OAuth env vars:", {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      });
      return res.status(500).json({ 
        error: "OAuth not configured", 
        details: "Server missing Google OAuth credentials" 
      });
    }

    if (!oauth2Client) {
      console.error("oauth2Client not initialized");
      return res.status(500).json({ error: "OAuth client not initialized" });
    }

    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const pkceKey = `${state}:${Date.now()}`;
    pkceStore.set(pkceKey, { codeVerifier, codeChallenge: code_challenge, state });

    const googleAuthUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state: pkceKey,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    res.redirect(googleAuthUrl);
  } catch (error) {
    console.error("OAuth authorize error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Google OAuth Callback ==========

app.get("/oauth/google/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const pkceData = pkceStore.get(state);
    if (!pkceData) {
      return res.status(400).send("Invalid state - PKCE data not found");
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set in environment variables");
      return res.status(500).send("Server misconfigured: missing JWT_SECRET");
    }

    const { tokens } = await oauth2Client.getToken(code);

    // JWT replaces tokenStore — self-contained, survives cold starts
    const claudeToken = jwt.sign(
      { googleTokens: tokens },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Auth code is short-lived (~10min) so same-instance memory is fine here
    const claudeAuthCode = crypto.randomBytes(16).toString("hex");
    tokenStore.set(`code:${claudeAuthCode}`, {
      claudeToken,
      state: pkceData.state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up pkce entry — no longer needed
    pkceStore.delete(state);

    const redirectUrl = `https://claude.ai/api/mcp/auth_callback?code=${claudeAuthCode}&state=${pkceData.state}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`OAuth error: ${error.message}`);
  }
});

// ========== Token Exchange Endpoint ==========
app.post("/oauth/token", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  const codeData = tokenStore.get(`code:${code}`);
  if (!codeData) {
    return res.status(401).json({ error: "Invalid code" });
  }

  if (codeData.expiresAt < Date.now()) {
    tokenStore.delete(`code:${code}`);
    return res.status(401).json({ error: "Code expired" });
  }

  // claudeToken IS the JWT — return it directly, no tokenStore lookup needed
  res.json({
    access_token: codeData.claudeToken,
    token_type: "Bearer",
    expires_in: 86400,
  });

  tokenStore.delete(`code:${code}`);
});

// ========== Auth Middleware ==========
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.tokenData = { googleTokens: decoded.googleTokens };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ========== Get Google Sheets Client ==========
async function getUserSheetsClient(tokenData) {
  const oauth2ClientUser = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2ClientUser.setCredentials(tokenData.googleTokens);
  return google.sheets({ version: "v4", auth: oauth2ClientUser });
}

// ========== MCP Tools ==========
app.post("/mcp/tools/read_sheet", authMiddleware, async (req, res) => {
  try {
    const { range } = req.body;
    if (!range) {
      return res.status(400).json({ error: "Missing range" });
    }

    const sheets = await getUserSheetsClient(req.tokenData);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
    });

    res.json({
      success: true,
      values: response.data.values || [],
      range: response.data.range,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/mcp/tools/append_row", authMiddleware, async (req, res) => {
  try {
    const { range, values } = req.body;
    if (!range || !values) {
      return res.status(400).json({ error: "Missing range or values" });
    }

    const sheets = await getUserSheetsClient(req.tokenData);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [values] },
    });

    res.json({
      success: true,
      updatedRange: response.data.updates.updatedRange,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/mcp/tools/update_cell", authMiddleware, async (req, res) => {
  try {
    const { range, value } = req.body;
    if (!range || value === undefined) {
      return res.status(400).json({ error: "Missing range or value" });
    }

    const sheets = await getUserSheetsClient(req.tokenData);
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [[value]] },
    });

    res.json({
      success: true,
      updatedCells: response.data.updatedCells,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== MCP Discovery ==========
app.get("/mcp/tools", authMiddleware, (req, res) => {
  res.json({
    tools: [
      {
        name: "read_sheet",
        description: "Read data from a Google Sheet",
        inputSchema: {
          type: "object",
          properties: {
            range: {
              type: "string",
              description: 'Sheet range (e.g., "Sheet1!A1:B10")',
            },
          },
          required: ["range"],
        },
      },
      {
        name: "append_row",
        description: "Append a row to a Google Sheet",
        inputSchema: {
          type: "object",
          properties: {
            range: { type: "string", description: 'Range (e.g., "Sheet1!A:Z")' },
            values: { type: "array", items: { type: "string" } },
          },
          required: ["range", "values"],
        },
      },
      {
        name: "update_cell",
        description: "Update a specific cell",
        inputSchema: {
          type: "object",
          properties: {
            range: { type: "string", description: 'Cell address (e.g., "Sheet1!A1")' },
            value: { type: "string", description: "Value to set" },
          },
          required: ["range", "value"],
        },
      },
    ],
  });
});

// ========== Health Check ==========
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "OAuth MCP server is running" });
});

// ========== MCP OAuth Discovery (Claude.ai requires these) ==========

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: "https://custom-google-sheets-mcp.vercel.app",
    authorization_servers: ["https://custom-google-sheets-mcp.vercel.app"],
  });
});

app.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json({
    issuer: "https://custom-google-sheets-mcp.vercel.app",
    authorization_endpoint: "https://custom-google-sheets-mcp.vercel.app/oauth/authorize",
    token_endpoint: "https://custom-google-sheets-mcp.vercel.app/oauth/token",
    registration_endpoint: "https://custom-google-sheets-mcp.vercel.app/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

app.post("/register", (req, res) => {
  const { client_name, redirect_uris, grant_types, response_types } = req.body;

  // Generate a client_id for Claude
  const clientId = crypto.randomBytes(16).toString("hex");

  res.status(201).json({
    client_id: clientId,
    client_name: client_name || "Claude",
    redirect_uris: redirect_uris || [],
    grant_types: grant_types || ["authorization_code"],
    response_types: response_types || ["code"],
    token_endpoint_auth_method: "none",
  });
});


app.post("/oauth/authorize", (req, res) => {
  // Redirect POST to GET handler logic
  req.query = { ...req.query, ...req.body };
  
  const { code_challenge, code_challenge_method, state } = req.query;

  if (!code_challenge || !state) {
    return res.status(400).json({ error: "Missing code_challenge or state" });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: "OAuth not configured" });
  }

  const pkceKey = `${state}:${Date.now()}`;
  pkceStore.set(pkceKey, { codeChallenge: code_challenge, state });

  const googleAuthUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: pkceKey,
  });

  res.redirect(googleAuthUrl);
});


app.post("/", async (req, res, next) => {
  if (req.body?.method === "initialize") {
    return res.json({
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "google-sheets-mcp", version: "1.0.0" },
      },
      id: req.body?.id,
    });
  }
   if (req.body?.method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      result: {
        tools: [
          {
            name: "read_sheet",
            description: "Read data from a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                range: { type: "string", description: 'e.g. "Sheet1!A1:B10"' },
              },
              required: ["range"],
            },
          },
          {
            name: "append_row",
            description: "Append a row to a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                range: { type: "string" },
                values: { type: "array", items: { type: "string" } },
              },
              required: ["range", "values"],
            },
          },
          {
            name: "update_cell",
            description: "Update a specific cell in a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                range: { type: "string" },
                value: { type: "string" },
              },
              required: ["range", "value"],
            },
          },
        ],
      },
      id,
    });
  }
  next(); // pass to authenticated handler below
});


// ========== MCP JSON-RPC Handler ==========
app.post("/", authMiddleware, async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;


  if (method?.startsWith("notifications/")) {
  return res.status(200).json({ jsonrpc: "2.0", result: {}, id });
  }
  
  if (method === "ping") {
    return res.status(200).json({ jsonrpc: "2.0", result: {}, id });
  }
  // if (jsonrpc !== "2.0") {
  //   return res.status(400).json({ error: "Invalid JSON-RPC version" });
  // }

  try {
    // MCP Initialize
    if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "google-sheets-mcp", version: "1.0.0" },
        },
        id,
      });
    }

    // MCP tools/list
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "read_sheet",
              description: "Read data from a Google Sheet",
              inputSchema: {
                type: "object",
                properties: {
                  range: { type: "string", description: 'Sheet range e.g. "Sheet1!A1:B10"' },
                },
                required: ["range"],
              },
            },
            {
              name: "append_row",
              description: "Append a row to a Google Sheet",
              inputSchema: {
                type: "object",
                properties: {
                  range: { type: "string" },
                  values: { type: "array", items: { type: "string" } },
                },
                required: ["range", "values"],
              },
            },
            {
              name: "update_cell",
              description: "Update a specific cell in a Google Sheet",
              inputSchema: {
                type: "object",
                properties: {
                  range: { type: "string" },
                  value: { type: "string" },
                },
                required: ["range", "value"],
              },
            },
          ],
        },
         id: req.body?.id, 
      });
    }

    // MCP tools/call
    if (method === "tools/call") {
      const { name, arguments: args } = params;
      const sheets = await getUserSheetsClient(req.tokenData);

      if (name === "read_sheet") {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: args.range,
        });
        return res.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(response.data.values || []) }],
          },
          id,
        });
      }

      if (name === "append_row") {
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: args.range,
          valueInputOption: "RAW",
          requestBody: { values: [args.values] },
        });
        return res.json({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: "Row appended successfully" }] },
          id,
        });
      }

      if (name === "update_cell") {
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: args.range,
          valueInputOption: "RAW",
          requestBody: { values: [[args.value]] },
        });
        return res.json({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: "Cell updated successfully" }] },
          id,
        });
      }

      return res.status(200).json({
        jsonrpc: "2.0",
        error: { code: -32601, message: "Tool not found" },
        id,
      });
    }

    // Unknown method
    return res.status(200).json({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not found" },
      id,
    });

  } catch (error) {
    return res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: error.message },
      id,
    });
  }
});

// ========== Root endpoint ==========
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Google Sheets MCP OAuth Server",
    endpoints: {
      authorize: "/oauth/authorize",
      callback: "/oauth/f/callback",
      token: "/oauth/token",
      tools: "/mcp/tools",
      health: "/health",
    },
  });
});

// Export for Vercel
module.exports = app;
