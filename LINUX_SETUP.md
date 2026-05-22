# Google Sheets MCP for Linux - Web Dashboard Guide

Since you're on Linux, you don't have access to Claude Desktop. We've built a **web-based dashboard** that gives you full access to your Google Sheets through the MCP server.

## Access Your Dashboard

**URL:** https://custom-google-sheets-mcp.vercel.app/

The dashboard is live and ready to use!

## Setup Instructions

### 1. Get Your API Key

You need an API key to use the dashboard. Ask the project owner or add one to Vercel:

```bash
# Generate a secure random key (run this command)
openssl rand -hex 32
```

This is the value for `MCP_API_KEY` in your Vercel environment variables.

### 2. Enter Your Credentials in the Dashboard

1. Open https://custom-google-sheets-mcp.vercel.app/
2. Click the **Settings** card (bottom right)
3. Enter:
   - **API Key**: The value you generated above (or get from project owner)
   - **Spreadsheet ID**: Found in your Google Sheet URL (`/spreadsheets/d/{SPREADSHEET_ID}/edit`)
4. Click **"Save Settings"** - your credentials are stored locally in your browser

### 3. Read Your Google Sheet

1. Click the **"Read Sheet"** card
2. Enter the sheet range (e.g., `Sheet1!A1:C10` or just `Sheet1`)
3. Click **"Read"**
4. Your data appears instantly!

### 4. Add Rows to Your Sheet

1. Click the **"Append Row"** card
2. Enter values as JSON array: `["value1", "value2", "value3"]`
3. Click **"Append"**
4. New row added to your sheet

### 5. Update Specific Cells

1. Click the **"Update Cell"** card
2. Enter cell address: `A1` (or `Sheet1!B2`)
3. Enter new value: `"hello world"` or `42` or `=SUM(A1:A10)`
4. Click **"Update"**

## Example Workflow

```
1. Settings: API Key = "abc123...", Spreadsheet = "1f3Qh..."
2. Read: Sheet1!A1:Z100 → See all your data
3. Append: ["Alice", "30", "Engineer"] → Add new person
4. Update: A1 → "Bob" → Change existing cell
```

## Local Usage (For Development)

If you want to run locally without Vercel:

```bash
# Install dependencies
npm install

# Add local .env file with:
# GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...full JSON...}
# SPREADSHEET_ID=your-sheet-id
# MCP_API_KEY=your-api-key

# Start local server (port 5000)
npm run dev:http

# Open http://localhost:5000
```

## Privacy & Security

- Your credentials are stored **only in your browser's localStorage**
- They are **never sent to third parties** - only to your Google Sheet
- API key is required for all operations
- Each user's browser has its own separate credentials

## Troubleshooting

### "API Key is required"
→ Check Settings and make sure API Key is entered correctly

### "Couldn't reach the MCP server"
→ The Vercel URL might be slow. Wait a few seconds and try again.

### "Invalid spreadsheet ID"
→ Copy the ID directly from your sheet URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`

### "Permission denied"
→ Make sure your service account has access to the spreadsheet (shared with that email)

## API Documentation (For Developers)

The underlying HTTP API is at: `https://custom-google-sheets-mcp.vercel.app/api/tools`

```bash
# Example: Read sheet
curl -X POST https://custom-google-sheets-mcp.vercel.app/api/tools \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "tool": "read_sheet",
    "arguments": {
      "range": "Sheet1!A1:C10"
    }
  }'

# Example: Append row
curl -X POST https://custom-google-sheets-mcp.vercel.app/api/tools \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "tool": "append_row",
    "arguments": {
      "values": ["Alice", "30", "Engineer"]
    }
  }'
```

## Next Steps

1. Open the dashboard: https://custom-google-sheets-mcp.vercel.app/
2. Add your API Key in Settings
3. Start reading/writing to your Google Sheet!

Questions? Check the main README.md for architecture details.
