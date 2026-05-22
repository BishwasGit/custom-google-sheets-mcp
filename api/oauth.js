const express = require("express");
const crypto = require("crypto");
const { google } = require("googleapis");

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
  const { code_challenge, code_challenge_method, state, resource } = req.query;

  if (!code_challenge || !state) {
    return res.status(400).json({ error: "Missing code_challenge or state" });
  }

  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const pkceKey = `${state}:${Date.now()}`;
  pkceStore.set(pkceKey, { codeVerifier, codeChallenge: code_challenge, state });

  const googleAuthUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: pkceKey,
  });

  res.redirect(googleAuthUrl);
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

    const { tokens } = await oauth2Client.getToken(code);

    const claudeToken = generateToken();
    const tokenData = {
      googleTokens: tokens,
      claudeToken,
      state: pkceData.state,
      createdAt: Date.now(),
    };

    tokenStore.set(claudeToken, tokenData);

    const claudeAuthCode = crypto.randomBytes(16).toString("hex");
    tokenStore.set(`code:${claudeAuthCode}`, {
      claudeToken,
      state: pkceData.state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectUrl = `https://claude.ai/api/mcp/auth_callback?code=${claudeAuthCode}&state=${pkceData.state}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).send(`OAuth error: ${error.message}`);
  }
});

// ========== Token Exchange Endpoint ==========
app.post("/oauth/token", (req, res) => {
  const { code, state } = req.body;

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

  const tokenData = tokenStore.get(codeData.claudeToken);
  if (!tokenData) {
    return res.status(401).json({ error: "Token not found" });
  }

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

  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.tokenData = tokenData;
  req.token = token;
  next();
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

// ========== Root endpoint ==========
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Google Sheets MCP OAuth Server",
    endpoints: {
      authorize: "/oauth/authorize",
      callback: "/oauth/google/callback",
      token: "/oauth/token",
      tools: "/mcp/tools",
      health: "/health",
    },
  });
});

// Export for Vercel
module.exports = app;
