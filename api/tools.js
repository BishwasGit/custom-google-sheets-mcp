const { google } = require("googleapis");

// Parse credentials
function getCredentials() {
  const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!cred) throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set");
  
  try {
    // Try to parse as JSON
    return JSON.parse(cred);
  } catch (e) {
    console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON:", e.message);
    throw new Error(`Invalid credentials format: ${e.message}`);
  }
}

async function getSheetsClient() {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Verify API Key - accept X-API-Key header, Bearer token, or query parameter
function verifyApiKey(req) {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) return false;
  
  // Check X-API-Key header
  if (req.headers["x-api-key"] === apiKey) {
    return true;
  }
  
  // Check Bearer token
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === apiKey) {
      return true;
    }
  }
  
  // Check query parameter (for Claude Web compatibility)
  if (req.url.includes("?")) {
    const url = new URL(req.url, "http://localhost");
    const key = url.searchParams.get("key");
    if (key === apiKey) {
      return true;
    }
  }
  
  return false;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  console.log(`[MCP] ${req.method} ${req.url}`);

  try {
    // Health check endpoint - no auth needed (for Claude Web connectivity verification)
    if ((pathname === "/health" || pathname === "/ping") && req.method === "GET") {
      return res.status(200).json({ 
        status: "ok",
        message: "Google Sheets MCP is running"
      });
    }

    const pathname = req.url.split("?")[0]; // Remove query string
    
    // Root endpoint - MCP initialization (Claude Web connectivity check - no auth needed)
    if ((pathname === "/" || pathname === "") && req.method === "GET") {
      return res.status(200).json({
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "google-sheets-mcp",
          version: "1.0.0",
        },
      });
    }

    // /tools GET - return tools list (REQUIRES AUTH when query string is present)
    if (pathname === "/tools" && req.method === "GET") {
      if (!verifyApiKey(req)) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
      }

      return res.status(200).json({
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
    }

    // Tool execution - requires auth
    if ((pathname.startsWith("/tools/") || (pathname.startsWith("/") && pathname !== "/")) && req.method === "POST") {
      if (!verifyApiKey(req)) {
        return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
      }

      // Extract tool name from path
      const parts = pathname.split("/").filter(p => p);
      const toolName = parts[parts.length - 1]; // Last part is the tool name
      const body = await parseBody(req);
      const { range, values, value } = body;

      const sheets = await getSheetsClient();

      if (toolName === "append_row") {
        if (!range || !values) {
          return res.status(400).json({
            error: "Missing required fields: range, values",
          });
        }

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
          valueInputOption: "RAW",
          requestBody: { values: [values] },
        });

        return res.status(200).json({
          result: {
            success: true,
            updatedRange: response.data.updates.updatedRange,
          },
        });
      }

      if (toolName === "read_sheet") {
        if (!range) {
          return res.status(400).json({
            error: "Missing required field: range",
          });
        }

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
        });

        return res.status(200).json({
          result: {
            values: response.data.values || [],
          },
        });
      }

      if (toolName === "update_cell") {
        if (!range || !value) {
          return res.status(400).json({
            error: "Missing required fields: range, value",
          });
        }

        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
          valueInputOption: "RAW",
          requestBody: { values: [[value]] },
        });

        return res.status(200).json({
          result: {
            success: true,
            updatedCells: response.data.updatedCells,
          },
        });
      }

      return res.status(404).json({
        error: `Tool ${toolName} not found`,
      });
    }

    return res.status(404).json({ error: "Endpoint not found" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};
