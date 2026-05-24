# Vercel Deployment: Quick Start

**TL;DR**: You upload nothing. Vercel auto-deploys from GitHub. Just add 4 environment variables.

---

## 🚀 In 3 Steps

### 1. Deploy to Vercel (5 min)
```
1. Go to https://vercel.com
2. New Project → Import Git Repository
3. Select: BishwasGit/custom-google-sheets-mcp
4. Click Deploy
5. Wait 2-3 minutes
```

**Your URL**: `https://custom-google-sheets-mcp.vercel.app`

### 2. Add Environment Variables (5 min)
```
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add 4 variables:

   GOOGLE_APPLICATION_CREDENTIALS_B64 = (base64 encoded service account)
   SPREADSHEET_ID = 1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c
   MCP_API_KEY = (run: openssl rand -hex 32)
   PORT = 3000

3. Vercel auto-redeployes
```

### 3. Connect to Claude.ai (5 min)
```
1. Go to https://claude.ai → Settings → Connectors
2. Add Custom Connector
3. Name: Google Sheets MCP
   URL: https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_API_KEY
4. Save
5. Test in chat: "Read my bug sheet"
```

---

## 📝 Generate Required Values

**Service Account (Base64):**
```bash
cat /media/DriveB/custom_mcp/service-account.json | base64 -w 0
# Paste entire output into GOOGLE_APPLICATION_CREDENTIALS_B64
```

**API Key:**
```bash
openssl rand -hex 32
# Copy the 64-character string into MCP_API_KEY
```

---

## ✅ Test Deployment

```bash
curl "https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_API_KEY"
```

Should return JSON with your 3 tools.

---

## 📚 Full Guides

- `VERCEL_DEPLOYMENT.md` - Complete technical details
- `CLAUDE_WEB_CONNECTOR.md` - Architecture & troubleshooting
- `BUG_SHEET_QUICK_REF.md` - Bug tracker reference

---

## ❌ What NOT to Do

- ❌ Don't manually upload files to Vercel
- ❌ Don't commit `service-account.json` to GitHub
- ❌ Don't put API key in code (use environment variables)
- ❌ Don't use unencoded service account JSON in env vars (use base64)

---

## 🔧 How Auto-Deployment Works

```
You push to GitHub main branch
           ↓
Vercel webhook fires automatically
           ↓
Vercel clones your repo
           ↓
Vercel runs: npm install
           ↓
Vercel uses config from vercel.json
           ↓
App deploys to: custom-google-sheets-mcp.vercel.app
```

**No manual uploads needed!**

---

## 🎯 After Deployment

Ask Claude in chat:
```
"Read my Google Sheet data from Sheet1!A1:B5"
"Add a new bug to my tracker"
"Show me all open bugs"
```

Your MCP will handle it automatically!

---

**Time to live: 15 minutes ⏱️**
