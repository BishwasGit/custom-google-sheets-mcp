require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory token store (in production, use database)
const tokenStore = new Map();
const pkceStore = new Map();

// Google OAuth config
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:5001/oauth/google/callback"
);

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

console.log("🔐 OAuth 2.0 Server starting...");
console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID ? "✓" : "✗ NOT SET");
console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET ? "✓" : "✗ NOT SET");

// Generate random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Verify PKCE code challenge
function verifyPKCE(codeVerifier, codeChallenge) {
  const hash = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return hash === codeChallenge;
}

// ========== OAuth Authorize Endpoint ==========
// Claude redirects here with code_challenge for PKCE
app.get("/oauth/authorize", (req, res) => {
  const { code_challenge, code_challenge_method, state, resource } = req.query;

  console.log("[OAuth] Authorize request:", { code_challenge, state });

  if (!code_challenge || !state) {
    return res.status(400).json({ error: "Missing code_challenge or state" });
  }

  // Generate a code verifier for PKCE
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const pkceKey = `${state}:${Date.now()}`;
  pkceStore.set(pkceKey, { codeVerifier, codeChallenge: code_challenge, state });

  // Redirect to Google OAuth
  const googleAuthUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: pkceKey, // Pass our PKCE key as state so we can retrieve it later
  });

  console.log("[OAuth] Redirecting to Google:", googleAuthUrl.substring(0, 50) + "...");
  res.redirect(googleAuthUrl);
});

// ========== Google OAuth Callback ==========
// Google redirects here with auth code
app.get("/oauth/google/callback", async (req, res) => {
  const { code, state } = req.query;

  console.log("[OAuth] Google callback:", { code: code?.substring(0, 20) + "...", state });

  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  try {
    // Get PKCE data from our store
    const pkceData = pkceStore.get(state);
    if (!pkceData) {
      return res.status(400).send("Invalid state - PKCE data not found");
    }

    // Exchange auth code for token
    const { tokens } = await oauth2Client.getToken(code);
    console.log("[OAuth] Got Google tokens ✓");

    // Generate token for Claude
    const claudeToken = generateToken();
    const tokenData = {
      googleTokens: tokens,
      claudeToken,
      state: pkceData.state,
      createdAt: Date.now(),
      userId: tokens.id_token ? tokens.id_token.split(".")[1] : "unknown",
    };

    tokenStore.set(claudeToken, tokenData);
    console.log("[OAuth] Created Claude token, storing...");

    // Generate the auth code Claude expects (we use our token)
    const claudeAuthCode = crypto.randomBytes(16).toString("hex");
    tokenStore.set(`code:${claudeAuthCode}`, {
      claudeToken,
      state: pkceData.state,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min expiry
    });

    // Redirect back to Claude Web with auth code
    const redirectUrl = `https://claude.ai/api/mcp/auth_callback?code=${claudeAuthCode}&state=${pkceData.state}`;
    console.log("[OAuth] Redirecting to Claude:", redirectUrl.substring(0, 50) + "...");

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("[OAuth] Error in Google callback:", error.message);
    res.status(500).send(`OAuth error: ${error.message}`);
  }
});

// ========== Token Exchange Endpoint ==========
// Claude exchanges auth code for token
app.post("/oauth/token", (req, res) => {
  const { code, state } = req.body;

  console.log("[OAuth] Token exchange request:", { code, state });

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

  console.log("[OAuth] Token exchange successful ✓");

  // Return the token for Claude to use
  res.json({
    access_token: codeData.claudeToken,
    token_type: "Bearer",
    expires_in: 86400, // 24 hours
  });

  tokenStore.delete(`code:${code}`);
});

// ========== API Endpoints (Protected with token) ==========
// Middleware to verify Claude token
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

  // Attach token data to request
  req.tokenData = tokenData;
  req.token = token;
  next();
}

// Get Google Sheets client for this user
async function getUserSheetsClient(tokenData) {
  const oauth2ClientUser = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2ClientUser.setCredentials(tokenData.googleTokens);
  return google.sheets({ version: "v4", auth: oauth2ClientUser });
}

// ========== MCP Tools Endpoints ==========
app.post("/mcp/tools/read_sheet", authMiddleware, async (req, res) => {
  try {
    const { range } = req.body;
    if (!range) {
      return res.status(400).json({ error: "Missing range" });
    }

    const sheets = await getUserSheetsClient(req.tokenData);
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json({
      success: true,
      values: response.data.values || [],
      range: response.data.range,
    });
  } catch (error) {
    console.error("[API] Read sheet error:", error.message);
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
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [values],
      },
    });

    res.json({
      success: true,
      updatedRange: response.data.updates.updatedRange,
    });
  } catch (error) {
    console.error("[API] Append row error:", error.message);
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
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]],
      },
    });

    res.json({
      success: true,
      updatedCells: response.data.updatedCells,
    });
  } catch (error) {
    console.error("[API] Update cell error:", error.message);
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
            range: {
              type: "string",
              description: 'Sheet range (e.g., "Sheet1!A:Z")',
            },
            values: {
              type: "array",
              items: { type: "string" },
              description: "Array of values for the row",
            },
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
            range: {
              type: "string",
              description: 'Cell address (e.g., "Sheet1!A1")',
            },
            value: {
              type: "string",
              description: "Value to set",
            },
          },
          required: ["range", "value"],
        },
      },
    ],
  });
});

// ========== Health Check ==========
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "OAuth server is running" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🔐 OAuth Server running on http://localhost:${PORT}`);
  console.log(`📍 OAuth authorize: GET  http://localhost:${PORT}/oauth/authorize`);
  console.log(`📍 Google callback: GET  http://localhost:${PORT}/oauth/google/callback`);
  console.log(`📍 Token exchange: POST http://localhost:${PORT}/oauth/token`);
  console.log(`📍 MCP tools:      POST http://localhost:${PORT}/mcp/tools/...`);
});
