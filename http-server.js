require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

console.error("🌐 Initializing Google Sheets MCP HTTP Server...");

// Google Sheets auth - handle both file path and JSON content
let authConfig;
try {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credPath) {
    // Try to parse as JSON first (for Vercel/cloud environments)
    try {
      authConfig = JSON.parse(credPath);
    } catch {
      // If not JSON, treat as file path (for local development)
      authConfig = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    }
  } else {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set");
  }
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: authConfig,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

// Auth middleware - accept X-API-Key header, Bearer token, or query parameter
function authMiddleware(req, res, next) {
  const xApiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const queryKey = req.query.key;
  const apiKey = process.env.MCP_API_KEY;
  
  // Check X-API-Key header
  if (xApiKey && xApiKey === apiKey) {
    return next();
  }
  
  // Check Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === apiKey) {
      return next();
    }
  }
  
  // Check query parameter (for Claude Web compatibility)
  if (queryKey && queryKey === apiKey) {
    return next();
  }
  
  return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
}

// Test route
app.get("/", (req, res) => {
  res.json({ 
    status: "Google Sheets MCP running",
    auth: "Accepts X-API-Key or Authorization: Bearer <token>"
  });
});

// List available tools
app.get("/tools", authMiddleware, (req, res) => {
  console.error("GET /tools called");
  res.json({
    tools: [
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
        name: "update_cell",
        description: "Update a specific cell in a Google Sheet",
        inputSchema: {
          type: "object",
          properties: {
            range: {
              type: "string",
              description: 'Cell range (e.g., "Sheet1!A1")',
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

// Execute tool
app.post("/tools/:name", authMiddleware, async (req, res) => {
  const { name } = req.params;
  const { range, values, value } = req.body;

  try {
    const sheets = await getSheetsClient();

    if (name === "append_row") {
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [values],
        },
      });
      return res.json({
        success: true,
        updatedRange: response.data.updates.updatedRange,
      });
    }

    if (name === "read_sheet") {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
      });
      return res.json({
        values: response.data.values || [],
      });
    }

    if (name === "update_cell") {
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[value]],
        },
      });
      return res.json({
        success: true,
        updatedCells: response.data.updatedCells,
      });
    }

    return res.status(404).json({ error: `Tool ${name} not found` });
  } catch (error) {
    console.error(`Error in ${name}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.error(`🌐 HTTP MCP Server running on http://localhost:${PORT}`);
  console.error(`📍 Available endpoints:`);
  console.error(`   - GET  http://localhost:${PORT}/`);
  console.error(`   - GET  http://localhost:${PORT}/tools`);
  console.error(`   - POST http://localhost:${PORT}/tools/append_row`);
  console.error(`   - POST http://localhost:${PORT}/tools/read_sheet`);
  console.error(`   - POST http://localhost:${PORT}/tools/update_cell`);
});
