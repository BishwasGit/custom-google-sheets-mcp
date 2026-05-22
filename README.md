# Google Sheets MCP

A Model Context Protocol (MCP) server for Google Sheets integration with Claude AI.

## 🐧 For Linux Users

If you're on **Linux**, you can't use Claude Desktop (it's macOS/Windows only). Instead, use our **web dashboard**!

→ **[Linux Setup Guide](LINUX_SETUP.md)** ← Open this for complete instructions

**Quick start:** Visit https://custom-google-sheets-mcp.vercel.app/ and add your API key in Settings.

## Features

- **append_row** - Add rows to your Google Sheet
- **read_sheet** - Query data from ranges
- **update_cell** - Modify individual cells
- **API Key Authentication** - Secure access to your MCP server
- **Web Dashboard** - User-friendly interface for all operations (Linux-friendly!)

## Setup

### Prerequisites

- Node.js 18+
- Google Cloud Service Account with Sheets API enabled
- Claude Pro/Max subscription (for Claude Web integration)

### Local Development

1. Clone the repository
```bash
git clone git@github.com:BishwasGit/custom-google-sheets-mcp.git
cd custom-google-sheets-mcp
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
SPREADSHEET_ID=your_spreadsheet_id
MCP_API_KEY=your_secure_api_key
PORT=5000
```

4. Run locally
```bash
PORT=5000 node http-server.js
```

### Deploy to Vercel

1. Push to GitHub (already done)
2. Import project in Vercel dashboard
3. Add these environment variables:
   - `GOOGLE_APPLICATION_CREDENTIALS` - Your service account JSON (full content)
   - `SPREADSHEET_ID` - Your spreadsheet ID
   - `MCP_API_KEY` - A secure random API key (generate with: `openssl rand -hex 32`)
4. Deploy!

### Connect to Claude Web

**⚠️ Important:** Claude Web requires authentication for custom connectors.

1. Go to `claude.ai/customize/connectors`
2. Add custom connector:
   - **Name**: `google-sheets-mcp`
   - **URL**: `https://custom-google-sheets-mcp.vercel.app`
   - **Authentication**: Select "API Key" 
   - **API Key Header**: `X-API-Key`
   - **API Key Value**: Your `MCP_API_KEY` value
3. Save

## API Endpoints

All endpoints except `/` require `X-API-Key` header:

```bash
curl -H "X-API-Key: your_key" https://custom-google-sheets-mcp.vercel.app/tools
```

- `GET /` - Server info (no auth required)
- `GET /tools` - List available tools
- `POST /tools/append_row` - Append a row
- `POST /tools/read_sheet` - Read data
- `POST /tools/update_cell` - Update a cell

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON | Yes |
| `SPREADSHEET_ID` | Google Sheet ID | Yes |
| `MCP_API_KEY` | API key for authentication | Yes |
| `PORT` | Server port (default: 3000) | No |

## Security

- API keys are validated on all tool endpoints
- Service account credentials are stored securely as environment variables
- Only HTTPS connections are supported
- CORS is enabled for Claude Web integration

## License

MIT

