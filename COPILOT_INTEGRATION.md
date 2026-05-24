# Copilot CLI Integration Guide

Your Google Sheets MCP is now ready to work with **GitHub Copilot CLI**! 🚀

## Quick Start

### 1. Ensure Environment Variables Are Set

Your MCP needs these environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
export SPREADSHEET_ID="1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c"
```

Or load them from `.env`:
```bash
source .env
```

### 2. Verify MCP Configuration

The `.copilot-config.json` file is already set up:

```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}",
        "SPREADSHEET_ID": "${SPREADSHEET_ID}"
      }
    }
  }
}
```

### 3. Use with Copilot CLI

Now you can use your MCP tools directly in Copilot CLI:

```bash
# Start using your MCP in Copilot
copilot -m custom_mcp

# Or with context about your task
copilot "Read the data from my Google Sheet and show me the summary"
```

## Available Tools

### 1. **read_sheet**
Read data from a specific range in your Google Sheet.

**Input:**
- `range` (string): Sheet range (e.g., "Sheet1!A1:B10")

**Example:**
```
Read data from Sheet1!A1:B10
```

### 2. **append_row**
Add a new row to your Google Sheet.

**Input:**
- `range` (string): Sheet range (e.g., "Sheet1!A:Z")
- `values` (array of strings): Data for each column

**Example:**
```
Append a new row with values: ["John", "Doe", "john@example.com"] to Sheet1!A:Z
```

### 3. **update_cell**
Update a specific cell value.

**Input:**
- `range` (string): Cell range (e.g., "Sheet1!A1")
- `value` (string): New value to set

**Example:**
```
Update cell Sheet1!A1 with value "Updated Header"
```

## Troubleshooting

### "This connector has no tools available"

This usually means:
1. ✅ **FIXED** - MCP server wasn't properly advertising tools (we fixed this!)
2. Environment variables not set - Make sure to export them before using Copilot

### Tools not appearing

1. Verify the MCP server starts without errors:
   ```bash
   cd /media/DriveB/custom_mcp
   timeout 3 node server.js
   # Should output: 🚀 Google Sheets MCP server is running...
   ```

2. Check that `.copilot-config.json` is in the repository root

3. Verify environment variables are available:
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   echo $SPREADSHEET_ID
   ```

### Authentication errors

If you get "Unauthorized" errors:
1. Verify `service-account.json` is valid
2. Check that the Google Sheets API is enabled for your service account
3. Ensure the service account has access to your spreadsheet

## Configuration

To customize the MCP setup, edit `.copilot-config.json`:

```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "/media/DriveB/custom_mcp",
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}",
        "SPREADSHEET_ID": "${SPREADSHEET_ID}"
      }
    }
  }
}
```

## Next Steps

1. ✅ Start using your MCP with Copilot CLI
2. ✅ Add more tools as needed (resources, prompts, etc.)
3. ✅ Consider deploying to production (Vercel, Cloud Functions, etc.)

For more MCP details, see the [Model Context Protocol](https://spec.modelcontextprotocol.io/) documentation.
