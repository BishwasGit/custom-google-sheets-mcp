# Vercel Deployment & Claude.ai Web Setup

Complete guide to deploy your Google Sheets MCP to Vercel and connect it to Claude.ai web.

---

## 📋 Prerequisites

- ✅ GitHub account (repo already set up)
- ✅ Vercel account (free tier works)
- ✅ Claude.ai web account
- ✅ Google Sheets API credentials in `.env`

---

## 🚀 Step 1: Prepare Your Repository

Your repo is already set up with:
- ✅ `vercel.json` - Vercel configuration
- ✅ `http-server.js` - Express HTTP server
- ✅ `api/oauth.js` - API route handler
- ✅ `package.json` - Dependencies

### Verify Files Are Ready

```bash
cd /media/DriveB/custom_mcp

# Check vercel.json exists
cat vercel.json

# Check http-server.js is up to date
grep -n "query.*key" http-server.js

# Check package.json
grep "start" package.json
```

---

## 🔗 Step 2: Connect GitHub to Vercel

### 2a. Sign In to Vercel

1. Go to **https://vercel.com**
2. Click **Sign in** → Choose **GitHub** auth
3. Authorize GitHub access

### 2b. Import Project

1. Click **New Project** (top right)
2. Select **Import Git Repository**
3. Find **BishwasGit/custom-google-sheets-mcp**
4. Click **Import**

### 2c. Configure Project

**Framework Preset**: Node.js

**Environment Variables** - Add these:

```
GOOGLE_APPLICATION_CREDENTIALS = (paste your service account JSON as a string)
SPREADSHEET_ID = 1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c
MCP_API_KEY = (generate a secure random string)
PORT = 3000
```

**Generate MCP_API_KEY**:
```bash
# Run locally:
openssl rand -hex 32

# Or use:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2d. Deploy

1. Click **Deploy**
2. Wait 2-3 minutes for deployment to complete
3. You'll get a URL like: `https://custom-google-sheets-mcp.vercel.app`

---

## ✅ Step 3: Verify Deployment

Test your deployed server:

```bash
# Test basic connectivity (no auth)
curl https://custom-google-sheets-mcp.vercel.app/api/tools

# Test with API key (replace YOUR_KEY)
curl -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  https://custom-google-sheets-mcp.vercel.app/api/tools

# Test with query parameter
curl "https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY"

# Expected: Should return your 3 tools
```

---

## 🔧 Step 4: IMPORTANT - Handle Service Account Credentials

**⚠️ SECURITY ISSUE**: Never paste raw service account JSON in env vars (it's visible in logs).

### Better Approach: Base64 Encoding

1. **Encode your service account**:
```bash
cat service-account.json | base64 -w 0
# Outputs a long string
```

2. **In Vercel environment variables**:
```
GOOGLE_APPLICATION_CREDENTIALS_B64 = (paste the base64 string)
```

3. **Update `http-server.js`** to decode it:

```javascript
const credString = process.env.GOOGLE_APPLICATION_CREDENTIALS_B64 
  ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_B64, 'base64').toString('utf8')
  : process.env.GOOGLE_APPLICATION_CREDENTIALS;

const authConfig = JSON.parse(credString);
```

4. **Never commit** `service-account.json` to git (it's in `.gitignore`)

---

## 🔑 Step 5: Set Up Authentication for Claude.ai

### Option A: Query Parameter (Easiest for Claude.ai Web)

Claude.ai web doesn't support custom headers, so use query parameter:

```
https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY
```

**In `http-server.js`**, verify this line exists in `authMiddleware`:

```javascript
const queryKey = req.query.key;
if (queryKey && queryKey === apiKey) {
  return next();
}
```

✅ Already in place!

### Option B: Bearer Token (More Secure, for API calls)

```bash
curl -H "Authorization: Bearer YOUR_MCP_API_KEY" \
  https://custom-google-sheets-mcp.vercel.app/api/tools
```

---

## 🤖 Step 6: Connect to Claude.ai Web

### 6a. Generate or Get Your API Key

```bash
# Check what you set in Vercel
# Or generate a new one:
openssl rand -hex 16
```

### 6b. Add Custom Connector in Claude.ai

1. Go to **https://claude.ai**
2. Click your name → **Settings** (bottom left)
3. Look for **"Connectors"** section
4. Click **"Add Custom Connector"** or **"Install Custom Connector"**
5. Fill in:

| Field | Value |
|-------|-------|
| **Name** | Google Sheets MCP |
| **URL** | `https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY` |
| **Description** | Read, write, and manage Google Sheets data |

6. Click **"Add"** or **"Install"**

### 6c. Test the Connection

In Claude.ai chat, ask:

```
"Can you read my Google Sheet data from Sheet1!A1:B5?"
```

Or:

```
"Add a new bug to my tracking sheet"
```

---

## 📊 Step 7: Available Endpoints

Once deployed, you have these endpoints:

### `/api/tools` - List & Call Tools

**GET** - List available tools:
```bash
curl "https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_KEY"
```

**POST** - Call a tool:
```bash
curl -X POST https://custom-google-sheets-mcp.vercel.app/api/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "tool": "read_sheet",
    "arguments": {"range": "Sheet1!A1:Z100"}
  }'
```

### Available Tools

#### 1. read_sheet
```json
{
  "tool": "read_sheet",
  "arguments": {
    "range": "Sheet1!A1:Z100"
  }
}
```

#### 2. append_row
```json
{
  "tool": "append_row",
  "arguments": {
    "range": "Sheet1!A:H",
    "values": ["5", "New Bug", "Open", "High", "Auth", "2026-05-24", "John", ""]
  }
}
```

#### 3. update_cell
```json
{
  "tool": "update_cell",
  "arguments": {
    "range": "Sheet1!C2",
    "value": "Resolved"
  }
}
```

---

## 🔍 Step 8: Monitoring & Troubleshooting

### Check Deployment Status

1. Go to https://vercel.com/dashboard
2. Find **custom-google-sheets-mcp** project
3. Click to see deployment logs

### Common Issues

| Issue | Solution |
|-------|----------|
| **"This connector has no tools available"** | API key might be wrong or server is down. Test endpoint first with curl. |
| **"Unauthorized"** | Verify API key matches `MCP_API_KEY` in Vercel environment |
| **"Service account error"** | Check credentials are valid and shared sheet access is working |
| **Connection timeout** | Wait 2-3 minutes after deployment, Vercel needs time to propagate |
| **"Cannot find range"** | Sheet name might be different. Check "Digital Biding" vs other sheet names |

### View Logs

```bash
# Via Vercel CLI
vercel logs custom-google-sheets-mcp

# Or via web dashboard:
# https://vercel.com/dashboard → Project → Deployments → Click deployment → Logs
```

---

## 📝 Step 9: What to Upload to Vercel

**Vercel automatically deploys from GitHub**, so:

✅ **Just push your code**:
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

**Vercel will:**
1. Detect push to main branch
2. Run `npm install`
3. Use config from `vercel.json`
4. Deploy to your URL

**Never upload to Vercel manually** - it auto-deploys from GitHub!

---

## 🎯 Quick Checklist

- [ ] Vercel account created
- [ ] GitHub repo connected to Vercel
- [ ] Environment variables set in Vercel:
  - [ ] `GOOGLE_APPLICATION_CREDENTIALS_B64` (encoded service account)
  - [ ] `SPREADSHEET_ID`
  - [ ] `MCP_API_KEY`
- [ ] Deployment successful
- [ ] API endpoint tested with curl
- [ ] Custom connector added to Claude.ai web
- [ ] Claude.ai web can access the connector

---

## 🚀 Your Deployment URL

Once live, your server will be at:

```
https://custom-google-sheets-mcp.vercel.app
```

For Claude.ai web, use:

```
https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY
```

---

## 📚 What Each File Does

| File | Purpose |
|------|---------|
| `vercel.json` | Tells Vercel how to run your app |
| `http-server.js` | Express server that handles HTTP requests |
| `api/oauth.js` | API route handler (called by http-server.js) |
| `package.json` | Dependencies and scripts |
| `server.js` | Stdio MCP server (for Copilot CLI) |
| `.env` | Local development environment variables (DON'T push to git) |

---

## 🔐 Security Checklist

- ✅ Never commit `service-account.json` to GitHub
- ✅ Use environment variables in Vercel (not hardcoded)
- ✅ Use base64 encoding for sensitive credentials
- ✅ Rotate `MCP_API_KEY` regularly
- ✅ Use query params for Claude.ai (since it can't send headers)
- ✅ Verify `.gitignore` has `service-account.json` and `.env`

---

## 🎊 You're All Set!

Your Google Sheets MCP is ready for production on Vercel and connected to Claude.ai web!

**Next**: Ask Claude to read your bug sheet! 🐛
