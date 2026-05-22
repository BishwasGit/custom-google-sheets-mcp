# Claude Integration Guide

## 📌 Important: Claude Web vs Claude Desktop

**Claude Web** (`claude.ai`): Has limited support for custom MCPs through their UI. Authentication and complex configurations are not fully exposed in the interface.

**Claude Desktop** (the app): ✅ **Recommended** - Full support for custom MCP servers via JSON configuration file.

---

## 🖥️ Setup for Claude Desktop

### Step 1: Install Claude Desktop
Download from: https://claude.ai/desktop

### Step 2: Configure the MCP Server
The config file should already be created at:
```
~/.config/Claude/claude_desktop_config.json
```

If not, create it manually with:
```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "node",
      "args": ["/media/DriveB/custom_mcp/server.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/media/DriveB/custom_mcp/service-account.json",
        "SPREADSHEET_ID": "1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop
Close and reopen Claude Desktop. The MCP server will start automatically.

### Step 4: Verify Connection
In Claude Desktop, you should see a "🔧" tools icon. Click it to see:
- append_row
- read_sheet  
- update_cell

### Step 5: Use the Tools
Just ask Claude naturally:
- "Add a row to my sheet with: Name, Email, Phone"
- "Read the data from Sheet1!A1:C10"
- "Update cell A1 with 'Hello'"

---

## 🌐 Claude Web (Alternative - Limitations)

Claude Web's custom connector UI doesn't fully support authentication configuration through the interface. The web version has strict limitations.

**If you want to use Claude Web eventually**, you would need:
1. Full OAuth 2.0 implementation (more complex)
2. Verification by Anthropic (for official integrations)

For now, **Claude Desktop is the best approach** for your custom MCP server.

---

## 📁 File Locations

- **Config file**: `~/.config/Claude/claude_desktop_config.json`
- **MCP Server**: `/media/DriveB/custom_mcp/server.js`
- **Credentials**: `/media/DriveB/custom_mcp/service-account.json`
- **Environment**: `/media/DriveB/custom_mcp/.env`

---

## 🚀 Vercel Deployment (Optional)

Your HTTP version is deployed at: `https://custom-google-sheets-mcp.vercel.app`

This can be used for:
- Testing the API manually
- Integration with other services
- Future Claude Web support (once OAuth 2.0 is implemented)

---

## ⚙️ Troubleshooting

**Claude Desktop not finding the MCP server?**
1. Check config file path: `~/.config/Claude/claude_desktop_config.json`
2. Verify Node.js is installed: `node --version`
3. Check file permissions on service account JSON
4. Restart Claude Desktop

**"Command not found: node"?**
- Make sure Node.js is installed and in PATH
- Or use full path in config: `/home/anoopinnovations/.nvm/versions/node/v26.1.0/bin/node`

**Server.js won't start?**
Try manually: `node /media/DriveB/custom_mcp/server.js`
This will show any errors.
