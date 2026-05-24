import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { google } from "googleapis";
import z from "zod";

dotenv.config();

const mcpServer = new McpServer({
  name: "google-sheets-mcp",
  version: "1.0.0",
});

// Google Sheets auth
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheetsClient() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

// Register append_row tool
mcpServer.registerTool(
  "append_row",
  {
    description: "Append a row to a Google Sheet",
    inputSchema: z.object({
      range: z.string().describe('Sheet range (e.g., "Sheet1!A:Z")'),
      values: z.array(z.string()).describe("Array of values for the row"),
    }),
  },
  async ({ range, values }) => {
    try {
      const sheets = await getSheetsClient();
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [values],
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              updatedRange: response.data.updates.updatedRange,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Register read_sheet tool
mcpServer.registerTool(
  "read_sheet",
  {
    description: "Read data from a Google Sheet",
    inputSchema: z.object({
      range: z.string().describe('Sheet range (e.g., "Sheet1!A1:B10")'),
    }),
  },
  async ({ range }) => {
    try {
      const sheets = await getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              values: response.data.values || [],
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Register update_cell tool
mcpServer.registerTool(
  "update_cell",
  {
    description: "Update a specific cell in a Google Sheet",
    inputSchema: z.object({
      range: z.string().describe('Cell range (e.g., "Sheet1!A1")'),
      value: z.string().describe("Value to set"),
    }),
  },
  async ({ range, value }) => {
    try {
      const sheets = await getSheetsClient();
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[value]],
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              updatedCells: response.data.updatedCells,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("🚀 Google Sheets MCP server is running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
