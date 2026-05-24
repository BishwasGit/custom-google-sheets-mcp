# Bug Tracking Sheet - Quick Reference

## ✅ What's Done

Your Google Sheet "Digital Biding" has been organized for bug tracking with:

- **8 columns** expanded and structured
- **Headers** set up (ID, Title, Status, Priority, Component, Date, Assigned, Outcome)
- **4 example bugs** added as templates
- **Ready for use** with MCP tools

---

## 📊 Sheet Structure

```
┌────┬────────────┬──────────┬──────────┬───────────┬────────────┬──────────┬──────────┐
│ A  │     B      │    C     │    D     │     E     │     F      │    G     │    H     │
├────┼────────────┼──────────┼──────────┼───────────┼────────────┼──────────┼──────────┤
│ ID │   Title    │  Status  │ Priority │ Component │Date Rpt'd  │Assigned  │ Outcome  │
├────┼────────────┼──────────┼──────────┼───────────┼────────────┼──────────┼──────────┤
│ 1  │Login timeout│In Progress│ High    │    Auth   │  2026-05-20│  John    │Optimizing│
│ 2  │CSV export  │ Closed   │ Critical │  Reports  │  2026-05-18│  Jane    │  Fixed   │
│ 3  │Dark mode   │ On Hold  │   Low    │    UI     │  2026-05-15│Unassigned│ Design   │
│ 4  │Data sync   │ Resolved │  High    │   Sync    │  2026-05-22│   Bob    │Complete  │
└────┴────────────┴──────────┴──────────┴───────────┴────────────┴──────────┴──────────┘
```

---

## 📋 Status Values (Column C)

Use these exactly as shown:

- **Open** - New bug, not started
- **In Progress** - Currently being worked on
- **Resolved** - Fixed, pending verification  
- **Closed** - Verified fixed or won't fix
- **On Hold** - Blocked waiting for something

---

## 🔴 Priority Values (Column D)

- **Critical** - System down / Major feature broken
- **High** - Significant impact on users
- **Medium** - Normal impact
- **Low** - Minor issue or cosmetic

---

## 🔧 MCP Tool Commands

### 1. Add a New Bug

```bash
copilot "Add a new bug: Payment webhook fails, status Open, \
priority Critical, component Payments, assigned to Alice"
```

Or directly via MCP:
```
append_row("Sheet1!A:H", ["5", "Payment webhook fails", "Open", 
"Critical", "Payments", "2026-05-24", "Alice", ""])
```

### 2. Update Bug Status

```bash
copilot "Update bug #1 status to Resolved"
```

Or via MCP:
```
update_cell("Sheet1!C2", "Resolved")
```

### 3. Read All Bugs

```bash
copilot "Read my bug sheet and show me all bugs"
```

Or via MCP:
```
read_sheet("Sheet1!A1:H100")
```

### 4. Get Specific Bugs

```bash
copilot "Show me all critical and high priority bugs that are open"
```

---

## 🎯 Best Practices

1. **Always use exact status values** - Copy from the list above
2. **Keep ID unique** - Never reuse a bug ID
3. **Update outcomes regularly** - Document what was done
4. **Archive closed bugs** - Move to a separate sheet after 30 days
5. **Add dates consistently** - Format: YYYY-MM-DD

---

## 📁 Google Sheet Location

- **Sheet Name:** Digital Biding
- **Sheet ID:** 1cztLPdKQ-G-Cmw4H7YtbHpcl0xXX75L_m8I7KbRca8c
- **Service Account:** mcp-sheet-bot@awesome-ridge-497110-k0.iam.gserviceaccount.com

---

## ✨ What You Can Do Now

1. ✅ **View** your organized sheet in Google Sheets
2. ✅ **Edit** directly in the sheet
3. ✅ **Use** MCP commands through Copilot CLI to manage bugs
4. ✅ **Automate** adding/updating bugs programmatically
5. ✅ **Share** the sheet with your team

---

## 🚀 Next Steps

1. Go to Google Sheets and open "Digital Biding"
2. Review the structure and example bugs
3. Modify/add your real bugs
4. Start using `copilot` commands to manage them
5. Integrate with your workflow

---

## 💡 Tips

- Use the MCP tools from Copilot CLI for quick updates
- Keep the sheet tab visible for quick reference
- Set up filters by Status/Priority for better visibility
- Archive old bugs to keep sheet clean

Happy bug tracking! 🐛✅
