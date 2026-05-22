# Connecting Custom Google Sheets MCP to Claude Web

## Problem Statement
Claude Web's custom connector interface is limited - it only accepts Name and URL, but doesn't expose authentication fields for custom API keys or headers. However, we can work around this using **Bearer Token Authentication** (standard HTTP auth that Claude Web recognizes).

## Solution: Bearer Token Authentication

We've modified your MCP server to accept authentication via the standard HTTP **Authorization** header using Bearer tokens.

### Server Setup

Your server now accepts both:
```
# Old way (X-API-Key header) - still works
X-API-Key: your-api-key

# New way (Bearer token) - compatible with Claude Web
Authorization: Bearer your-api-key
```

## How to Connect to Claude Web

### Step 1: Deploy Updated Server to Vercel

```bash
cd /media/DriveB/custom_mcp

# Verify Bearer auth works locally
curl -H "Authorization: Bearer test-key-local-dev-12345" http://localhost:5000/tools

# Commit the Bearer auth changes
git add http-server.js
git commit -m "Add Bearer token authentication for Claude Web compatibility"
git push
```

This triggers auto-deployment to Vercel.

### Step 2: Wait for Vercel Deployment

Visit: https://custom-google-sheets-mcp.vercel.app/api/tools

Test with Bearer token:
```bash
curl -X POST https://custom-google-sheets-mcp.vercel.app/api/tools \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"tool": "read_sheet", "arguments": {"range": "Sheet1"}}'
```

### Step 3: Add API Key to Vercel Environment

1. Go to: https://vercel.com/dashboard/projects
2. Find **custom-google-sheets-mcp** project
3. Go to **Settings → Environment Variables**
4. Add: `MCP_API_KEY` = (a secure random string)
   ```bash
   # Generate one:
   openssl rand -hex 32
   ```
5. Click **Save** and wait for redeploy

### Step 4: Add Custom Connector in Claude Web

1. Go to https://claude.ai
2. Click **Settings** (bottom left)
3. Navigate to **Connectors** section
4. Click **"Add Custom Connector"**
5. Fill in:
   - **Name**: `Google Sheets MCP`
   - **URL**: `https://custom-google-sheets-mcp.vercel.app/api/tools`
6. Click **"Add"**

### Step 5: Manual Authentication (Workaround)

⚠️ **Important**: Claude Web's connector UI doesn't have a place to enter API keys. This is a limitation of the platform.

**Workaround**: Add the API key directly to the URL as a query parameter (less secure but functional):

Instead of: `https://custom-google-sheets-mcp.vercel.app/api/tools`

Use: `https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_API_KEY`

However, this exposes your key in logs. A better approach is:

### Step 6 (Better): Modify Server to Accept Query Parameters

Update `http-server.js` to accept API key from query params:

```javascript
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
  
  // Check query parameter
  if (queryKey && queryKey === apiKey) {
    return next();
  }
  
  return res.status(401).json({ error: "Unauthorized: Invalid or missing API key" });
}
```

Then in Claude Web connector, use:
```
https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY
```

## Current Limitations

| Approach | Pro | Con |
|----------|-----|-----|
| Bearer Token (Standard HTTP Auth) | Secure, standard | Claude Web doesn't pass custom headers |
| Query Parameter | Works with Claude Web | API key visible in URLs/logs |
| OAuth 2.0 | Most secure | Complex, requires callback infrastructure |

## Recommended Approach

For now, use the **Query Parameter** approach since it works with Claude Web's limitations:

```
https://custom-google-sheets-mcp.vercel.app/api/tools?key=your-secure-api-key
```

## Testing the Connection

Once connected in Claude Web, you should be able to ask Claude:

```
"Read my Google Sheet and tell me what's in cells A1:C10"
```

Claude will use your MCP tools to fetch the data and respond.

## API Endpoint Reference

### Available Tools

```
POST /api/tools
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "tool": "read_sheet",
  "arguments": {
    "range": "Sheet1!A1:Z100"
  }
}
```

### Tool Options

**read_sheet**
```json
{
  "tool": "read_sheet",
  "arguments": {
    "range": "Sheet1"  // or "Sheet1!A1:C10"
  }
}
```

**append_row**
```json
{
  "tool": "append_row",
  "arguments": {
    "range": "Sheet1!A:Z",
    "values": ["value1", "value2", "value3"]
  }
}
```

**update_cell**
```json
{
  "tool": "update_cell",
  "arguments": {
    "range": "Sheet1!A1",
    "value": "new value"
  }
}
```

## Next Steps

1. Update `http-server.js` to support query parameter auth (if needed)
2. Deploy to Vercel
3. Add MCP_API_KEY to Vercel environment
4. Test locally with Bearer token
5. Add custom connector in Claude Web with query parameter URL
6. Test with Claude!

## Troubleshooting

### "Couldn't reach the MCP server"
- Verify Vercel deployment is live: `curl https://custom-google-sheets-mcp.vercel.app/api/tools`
- Check API key is set in Vercel environment variables
- Wait 5 minutes for deployment to fully propagate

### "Unauthorized: Invalid or missing API key"
- Make sure you're including the API key (Bearer token or query param)
- Verify MCP_API_KEY value matches what you're sending
- Check Vercel environment variables updated correctly

### "Tool not found"
- Verify tool name is exactly: `read_sheet`, `append_row`, or `update_cell`
- Check JSON format matches schema

