# Vercel 500 Error Fix - Complete Guide

## ❌ Problem

Your Vercel deployment shows:
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

## ✅ Root Cause

The serverless function couldn't initialize because the service account credentials weren't properly configured. The code was looking for `GOOGLE_APPLICATION_CREDENTIALS` but Vercel needs it as `GOOGLE_APPLICATION_CREDENTIALS_B64` (base64 encoded).

## 🔧 Solution

### YES - Update Environment Variables

You **must** add 4 environment variables to Vercel:

1. **GOOGLE_APPLICATION_CREDENTIALS_B64** ← This was missing/wrong
2. **SPREADSHEET_ID**
3. **MCP_API_KEY**
4. **PORT**

---

## 📋 Step-by-Step Fix

### Step 1: Generate Base64 Service Account

```bash
# Run this locally in your terminal:
cat /media/DriveB/custom_mcp/service-account.json | base64 -w 0

# Output: A very long string starting with "eyJ..."
# COPY THE ENTIRE STRING (it will be 2000+ characters)
```

### Step 2: Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click on your project: **custom-google-sheets-mcp**
3. Go to **Settings** tab
4. Click **Environment Variables** (on the left)

### Step 3: Add Environment Variables

#### Variable 1: GOOGLE_APPLICATION_CREDENTIALS_B64
- **Name**: `GOOGLE_APPLICATION_CREDENTIALS_B64`
- **Value**: (Paste the base64 string from Step 1)
- **Scope**: Production, Preview, Development
- Click **Save**

#### Variable 2: SPREADSHEET_ID
- **Name**: `SPREADSHEET_ID`
- **Value**: `1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c`
- **Scope**: Production, Preview, Development
- Click **Save**

#### Variable 3: MCP_API_KEY
- **Name**: `MCP_API_KEY`
- **Value**: (Your 64-character hex string)
- **Scope**: Production, Preview, Development
- Click **Save**

#### Variable 4: PORT
- **Name**: `PORT`
- **Value**: `3000`
- **Scope**: Production, Preview, Development
- Click **Save**

### Step 4: Trigger Redeploy

After adding variables:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait 2-3 minutes
5. Should see "Deployment successful"

### Step 5: Test Your Endpoint

```bash
# Test with your actual API key:
curl "https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_MCP_API_KEY"

# Should return JSON with 3 tools:
# {
#   "tools": [
#     {"name": "read_sheet", ...},
#     {"name": "append_row", ...},
#     {"name": "update_cell", ...}
#   ]
# }
```

If you see your tools, it's working! ✅

---

## 🔍 Verify Your Env Variables Are Set

On Vercel dashboard:
1. Go to **Settings → Environment Variables**
2. You should see all 4 variables listed
3. Click on each to verify the value is correct

---

## 🚨 Common Mistakes

| Mistake | Fix |
|---------|-----|
| **Copied incomplete base64 string** | Run the command again, make sure to copy ENTIRE output |
| **Missing GOOGLE_APPLICATION_CREDENTIALS_B64** | This is required - add it now |
| **Using wrong variable name** (e.g., `GOOGLE_CREDENTIALS`) | Use exact name: `GOOGLE_APPLICATION_CREDENTIALS_B64` |
| **API key has special characters** | Use the hex string (0-9, a-f only) |
| **Didn't wait for redeploy** | Wait 3-5 minutes after adding variables |
| **Still seeing 500 error** | Check Vercel logs for specific error message |

---

## 📊 Check Vercel Logs

For detailed error information:

1. Go to Vercel Dashboard
2. Click your project
3. Go to **Deployments**
4. Click the latest deployment
5. Scroll to **Logs** section
6. Look for error messages starting with `❌` or stack traces

---

## 🎯 After Fix Is Applied

Once Vercel shows your tools:

1. ✅ Endpoint works: `https://custom-google-sheets-mcp.vercel.app/api/tools`
2. ✅ Add to Claude.ai: Settings → Connectors → Add Custom
3. ✅ Name: `Google Sheets MCP`
4. ✅ URL: `https://custom-google-sheets-mcp.vercel.app/api/tools?key=YOUR_API_KEY`
5. ✅ Test in Claude chat

---

## 📝 What Changed in Your Code

Your `http-server.js` was updated to:
- ✅ Check for `GOOGLE_APPLICATION_CREDENTIALS_B64` (base64 encoded)
- ✅ Decode it automatically
- ✅ Fall back to `GOOGLE_APPLICATION_CREDENTIALS` (file path or JSON)
- ✅ Better error messages

This change auto-deployed to Vercel. Now you just need to set the env vars correctly.

---

## ✨ Quick Checklist

- [ ] Generated base64 service account
- [ ] Opened Vercel Dashboard
- [ ] Added GOOGLE_APPLICATION_CREDENTIALS_B64
- [ ] Added SPREADSHEET_ID
- [ ] Added MCP_API_KEY
- [ ] Added PORT
- [ ] Redeployed manually
- [ ] Waited 3+ minutes
- [ ] Tested with curl
- [ ] Got tools (not 500 error)
- [ ] Connected to Claude.ai

---

## ❓ Still Getting 500?

1. **Check logs**: Vercel Dashboard → Deployments → Latest → Logs
2. **Wait longer**: Sometimes takes 5 minutes to propagate
3. **Redeploy again**: Manual redeploy from Vercel can help
4. **Verify credentials**: Make sure service account JSON is valid
5. **Check sheet access**: Service account needs Editor permissions on sheet

---

**Time to fix: 10 minutes** ⏱️

Good luck! 🚀
