const { google } = require("googleapis");

// Parse credentials from environment variable
function getCredentials() {
  try {
    const cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!cred) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS not set");
    }
    
    // Try parsing as JSON (for Vercel)
    try {
      return JSON.parse(cred);
    } catch {
      // If that fails, it might be a path (shouldn't happen in Vercel)
      throw new Error("Invalid credentials format");
    }
  } catch (err) {
    console.error("❌ Credentials error:", err.message);
    throw err;
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Health check
    if (req.url === "/" && req.method === "GET") {
      return res.status(200).json({ status: "Google Sheets MCP running" });
    }

    // List tools
    if (req.url === "/tools" && req.method === "GET") {
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

    // Tool execution routes
    if (req.url.startsWith("/tools/") && req.method === "POST") {
      const toolName = req.url.split("/")[2];
      const { range, values, value } = req.body || {};

      const sheets = await getSheetsClient();

      if (toolName === "append_row") {
        const response = await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
          valueInputOption: "RAW",
          requestBody: {
            values: [values],
          },
        });
        return res.status(200).json({
          success: true,
          updatedRange: response.data.updates.updatedRange,
        });
      }

      if (toolName === "read_sheet") {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
        });
        return res.status(200).json({
          values: response.data.values || [],
        });
      }

      if (toolName === "update_cell") {
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range,
          valueInputOption: "RAW",
          requestBody: {
            values: [[value]],
          },
        });
        return res.status(200).json({
          success: true,
          updatedCells: response.data.updatedCells,
        });
      }

      return res.status(404).json({ error: `Tool ${toolName} not found` });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
