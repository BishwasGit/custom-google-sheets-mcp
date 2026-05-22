# OAuth 2.0 Setup for Claude Web Integration

This guide walks you through setting up proper OAuth 2.0 authentication so Claude Web can securely connect to your Google Sheets.

## Architecture

```
Claude Web User
     ↓
"Connect Google Sheets"
     ↓
Claude redirects to: /oauth/authorize
     ↓
Your server shows: "Authorize with Google?"
     ↓
User clicks "Yes"
     ↓
Google shows: "Allow access to your Sheets?"
     ↓
User grants access
     ↓
Google redirects back to you with code
     ↓
You exchange for Google token + create session
     ↓
You redirect to Claude: /api/mcp/auth_callback?code=...
     ↓
Claude stores your session token
     ↓
When Claude calls your API, it uses the token
     ↓
You use the stored Google token to access their sheet
```

## Step 1: Create Google OAuth App

1. Go to: https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable "Google Sheets API":
   - Search for "Sheets API"
   - Click Enable
4. Create OAuth 2.0 credentials:
   - Go to Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `http://localhost:5001/oauth/google/callback` (local dev)
     - `https://your-domain.vercel.app/oauth/google/callback` (production)
   - Click Create
   - Save Client ID and Client Secret

## Step 2: Configure Local Environment

```bash
cp .env.oauth.example .env.oauth

# Edit .env.oauth with your credentials:
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yyy
GOOGLE_REDIRECT_URI=http://localhost:5001/oauth/google/callback
SPREADSHEET_ID=your_sheet_id
```

## Step 3: Start OAuth Server Locally

```bash
# Install dependencies (if not done)
npm install

# Start server on port 5001
PORT=5001 node oauth-server.js
```

You should see:
```
🔐 OAuth Server running on http://localhost:5001
📍 OAuth authorize: GET  http://localhost:5001/oauth/authorize
📍 Google callback: GET  http://localhost:5001/oauth/google/callback
📍 Token exchange: POST http://localhost:5001/oauth/token
📍 MCP tools:      POST http://localhost:5001/mcp/tools/...
```

## Step 4: Test Locally

```bash
# Test health check
curl http://localhost:5001/health

# Test OAuth flow (this is what Claude Web will do):
# 1. Start auth with code challenge
curl "http://localhost:5001/oauth/authorize?code_challenge=TEST123&code_challenge_method=S256&state=STATE123"

# This redirects to Google - complete the flow in your browser
# After completing, you get redirected to Claude callback
```

## Step 5: Deploy to Vercel

```bash
# Add OAuth credentials to Vercel environment
# Go to: https://vercel.com/dashboard/custom-google-sheets-mcp
# Settings → Environment Variables → Add:

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yyy
GOOGLE_REDIRECT_URI=https://custom-google-sheets-mcp.vercel.app/oauth/google/callback
SPREADSHEET_ID=your_sheet_id
```

## Step 6: Create API Route on Vercel

Create `api/oauth.js`:

```javascript
const oauthApp = require('../oauth-server.js');
module.exports = oauthApp;
```

Update `vercel.json`:

```json
{
  "routes": [
    {
      "src": "/oauth/(.*)",
      "dest": "api/oauth.js"
    },
    {
      "src": "/mcp/(.*)",
      "dest": "api/oauth.js"
    }
  ]
}
```

Push to GitHub → Vercel auto-deploys

## Step 7: Connect to Claude Web

1. Go to https://claude.ai
2. Settings → Connectors → Add Custom Connector
3. Name: `Google Sheets OAuth`
4. Server URL: `https://custom-google-sheets-mcp.vercel.app`
5. Click Add

Claude will:
- Redirect to your `/oauth/authorize` endpoint
- User authorizes with Google
- You redirect back to Claude with token
- Claude stores token and can now call your MCP tools

## Step 8: Test Connection

In Claude Web, ask:
```
"Read my Google Sheet and show me all the data"
```

Claude will:
1. Call your `/mcp/tools` endpoint with Bearer token
2. Get the list of available tools
3. Call `/mcp/tools/read_sheet` with range
4. Display the data

## API Reference

### OAuth Endpoints

**GET /oauth/authorize**
- Initiated by Claude Web
- Parameters: `code_challenge`, `state`, `code_challenge_method`
- Redirects to Google OAuth

**GET /oauth/google/callback**
- Google redirects here
- Parameters: `code`, `state`
- Exchanges for Google token, creates session
- Redirects back to Claude

**POST /oauth/token**
- Claude calls this to exchange code for token
- Body: `{ "code": "...", "state": "..." }`
- Returns: `{ "access_token": "...", "token_type": "Bearer" }`

### MCP Tool Endpoints

All require `Authorization: Bearer <token>` header

**GET /mcp/tools**
- Returns available tools and their schemas

**POST /mcp/tools/read_sheet**
- Body: `{ "range": "Sheet1!A1:C10" }`
- Returns: `{ "values": [...], "range": "..." }`

**POST /mcp/tools/append_row**
- Body: `{ "range": "Sheet1!A:Z", "values": ["val1", "val2"] }`
- Returns: `{ "updatedRange": "Sheet1!1:1" }`

**POST /mcp/tools/update_cell**
- Body: `{ "range": "Sheet1!A1", "value": "new value" }`
- Returns: `{ "updatedCells": 1 }`

## Troubleshooting

### "Invalid client_id" error
- Check GOOGLE_CLIENT_ID is correct
- Verify it's from the right Google Cloud project

### "Redirect URI mismatch"
- Google OAuth redirect URI doesn't match
- Check GOOGLE_REDIRECT_URI in code matches Google Console

### "Sheet not found"
- SPREADSHEET_ID is wrong
- Or the authorized user doesn't have access

### Claude still says "Couldn't reach"
- Check OAuth server is running
- Check `/health` endpoint responds
- Verify environment variables set on Vercel

## Security Notes

- Tokens stored in memory (use database in production)
- Tokens expire after 24 hours
- PKCE prevents authorization code interception
- Google tokens are stored per-user session
- Never expose tokens in logs

## Next Steps

1. Get Google OAuth credentials
2. Test locally with `PORT=5001 node oauth-server.js`
3. Deploy to Vercel
4. Add credentials to Vercel environment
5. Connect from Claude Web
6. Test!

