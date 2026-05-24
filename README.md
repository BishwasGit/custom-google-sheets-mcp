# Google Sheets MCP for Claude.ai

Connect Claude.ai to your Google Sheets via a custom MCP (Model Context Protocol) server hosted on Vercel. Once set up, Claude can read, append, and update your spreadsheet directly from the chat.

---

## What you get

- `read_sheet` — read any range from your sheet
- `append_row` — add a new row
- `update_cell` — update a specific cell

---

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Google Cloud](https://console.cloud.google.com) account
- A Google Sheet you want Claude to access
- Node.js 18+ installed locally
- Git

---

## Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd custom_mcp
npm install
```

---

## Step 2 — Create a Google Cloud OAuth app

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Enable APIs** → enable **Google Sheets API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Name it (e.g. `Claude MCP`)
7. Under **Authorized redirect URIs** add:
   ```
   https://YOUR-VERCEL-APP.vercel.app/oauth/google/callback
   ```
   Replace `YOUR-VERCEL-APP` with your actual Vercel app name.
8. Click **Save** — copy the **Client ID** and **Client Secret**

> ⚠️ Make sure the redirect URI matches your Vercel deployment URL exactly — no trailing slash, must be `https`.

---

## Step 3 — Configure OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External**
3. Fill in app name, support email
4. Add scope: `https://www.googleapis.com/auth/spreadsheets`
5. Under **Audience → Test users** add your Gmail address
6. Click **Publish app** → Confirm

> ⚠️ You must publish the app (even unverified) or Google will block the login. When you see the "unverified app" warning during login, click **Advanced → Go to app**.

---

## Step 4 — Deploy to Vercel

### Option A — Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B — Via GitHub

Push to GitHub → import project in Vercel dashboard → it auto-deploys.

---

## Step 5 — Set environment variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console OAuth client |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console OAuth client |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-VERCEL-APP.vercel.app/oauth/google/callback` |
| `JWT_SECRET` | A long random string (generate below) |
| `SPREADSHEET_ID` | Your Google Sheet ID (from the URL) |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Get your Spreadsheet ID from the sheet URL:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_IS_HERE/edit
```

> ⚠️ After adding env vars, you must redeploy for them to take effect:
> ```bash
> vercel --prod
> ```

---

## Step 6 — Verify deployment

Hit your health endpoint:
```
https://YOUR-VERCEL-APP.vercel.app/health
```

Should return:
```json
{ "status": "ok", "message": "Google Sheets MCP OAuth Server" }
```

---

## Step 7 — Connect to Claude.ai

1. Go to [claude.ai](https://claude.ai) → **Settings → Connectors**
2. Click **Add connector**
3. Enter:
   - **Name:** `Google Sheets MCP`
   - **URL:** `https://YOUR-VERCEL-APP.vercel.app`
4. Click **Connect**
5. Google login screen appears → sign in with the account you whitelisted
6. Authorize the Sheets scope
7. Done — Claude now has access to your sheet ✅

---

## Usage examples

Once connected, just ask Claude naturally:

```
Read the data in Sheet1!A1:D10
```
```
Append a row with ["John", "Doe", "john@example.com"] to Sheet1!A:Z
```
```
Update cell Sheet1!B3 to "Completed"
```

---

## Project structure

```
├── api/
│   └── oauth.cjs        ← Main server (Vercel entry point)
├── public/
│   └── index.html       ← Dashboard UI
├── vercel.json          ← Vercel routing config
└── package.json
```

---

## How it works

```
Claude.ai → POST / (tools/list)     → Your Vercel server → returns tool definitions
Claude.ai → GET /oauth/authorize    → Redirects to Google login
Google    → GET /oauth/google/callback → Issues JWT token back to Claude
Claude.ai → POST / (tools/call) + JWT → Your server → Google Sheets API → data
```

---

## Troubleshooting

**500 FUNCTION_INVOCATION_FAILED**
Your `package.json` likely has `"type": "module"` — remove it. The server uses CommonJS (`require`).

**"This connector has no tools available"**
The `tools/list` method is behind auth middleware. Make sure it's handled in the unauthenticated first handler.

**Error 400: redirect_uri_mismatch**
- Check `GOOGLE_REDIRECT_URI` in Vercel matches exactly what's registered in Google Console
- Make sure you're using the OAuth Client ID, not a service account ID
- Publish your OAuth app in Google Console (Testing mode blocks logins)

**"Authorization with the MCP server failed"**
Disconnect and reconnect the Claude connector to force a fresh token. Cached tokens from failed attempts won't work.

**POST returning 404**
All JSON-RPC errors must return HTTP 200, not 404. Check that unknown methods return `res.status(200).json(...)`.

---

## Security notes

- Change `MCP_API_KEY` from any placeholder value before sharing the deployment
- `JWT_SECRET` should be at least 32 random characters
- The Spreadsheet ID and OAuth credentials are tied to your Vercel deployment — don't commit `.env` files
- For production use, replace in-memory `pkceStore`/`tokenStore` Maps with a database (Redis, Upstash, etc.) — they reset on cold starts

---

## License

MIT
