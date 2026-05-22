# Google Sheets MCP

A Model Context Protocol (MCP) server for Google Sheets integration with Claude AI.

## Features

- **append_row** - Add rows to your Google Sheet
- **read_sheet** - Query data from ranges
- **update_cell** - Modify individual cells

## Setup

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
Create a `.env` file:
```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
SPREADSHEET_ID=your_spreadsheet_id
PORT=5000
```

4. Add your Google Service Account credentials
Download from Google Cloud Console and save as `service-account.json`

5. Run locally
```bash
PORT=5000 node http-server.js
```

### Deploy to Vercel

1. Push to GitHub (already done)
2. Import project in Vercel dashboard
3. Add environment variables:
   - `GOOGLE_APPLICATION_CREDENTIALS` - Your service account JSON (paste contents)
   - `SPREADSHEET_ID` - Your spreadsheet ID
4. Deploy!

### Connect to Claude

1. Go to `claude.ai/customize/connectors`
2. Add custom connector:
   - **URL**: Your Vercel deployment URL
   - **Name**: `google-sheets-mcp`

## API Endpoints

- `GET /` - Health check
- `GET /tools` - List available tools
- `POST /tools/append_row` - Append a row
- `POST /tools/read_sheet` - Read data
- `POST /tools/update_cell` - Update a cell

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `SPREADSHEET_ID` | Google Sheet ID |
| `PORT` | Server port (default: 3000) |

## License

MIT
