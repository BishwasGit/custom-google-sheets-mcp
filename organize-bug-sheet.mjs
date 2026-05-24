import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

async function organizeBugSheet() {
  try {
    console.log("🚀 Organizing your bug tracking sheet...\n");
    
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    // Step 1: Read current data
    console.log("📖 Reading your current sheet data...");
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Sheet1'!A1:H100",  // Quote the sheet name
    });

    const currentRows = readResponse.data.values || [];
    console.log(`✓ Found ${currentRows.length} rows\n`);
    
    if (currentRows.length > 0) {
      console.log("Current data (first 5 rows):");
      currentRows.slice(0, 5).forEach((row, idx) => {
        console.log(`  Row ${idx + 1}: ${row.map(v => (v || "").substring(0, 12)).join(" | ")}`);
      });
      console.log();
    }
    
    // Step 2: Set up headers
    console.log("📝 Setting up bug tracking headers...\n");
    
    const headers = ["ID", "Title", "Status", "Priority", "Component", "Reported Date", "Assigned To", "Outcome"];
    const headerCells = [];
    
    for (let i = 0; i < headers.length; i++) {
      const col = String.fromCharCode(65 + i);
      headerCells.push({
        range: `'Sheet1'!${col}1`,
        values: [[headers[i]]],
      });
      console.log(`  ✓ Column ${col}: ${headers[i]}`);
    }
    
    // Batch update headers
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        data: headerCells,
        valueInputOption: "RAW",
      },
    });
    
    console.log("\n✅ Headers created successfully!\n");
    
    // Step 3: Display structure
    console.log("📋 Sheet structure is now organized as:\n");
    console.log("┌────┬─────────────────┬──────────────┬──────────┬─────────────┬────────────────┬──────────────┬──────────────────┐");
    console.log("│ A  │        B        │      C       │    D     │      E      │       F        │      G       │        H         │");
    console.log("├────┼─────────────────┼──────────────┼──────────┼─────────────┼────────────────┼──────────────┼──────────────────┤");
    console.log("│ ID │      Title      │    Status    │ Priority │  Component  │  Reported Date │ Assigned To  │     Outcome      │");
    console.log("└────┴─────────────────┴──────────────┴──────────┴─────────────┴────────────────┴──────────────┴──────────────────┘\n");
    
    // Step 4: Add example entries if empty
    if (currentRows.length <= 1) {
      console.log("➕ Adding example bug entries...\n");
      
      const exampleBugs = [
        ["1", "Login page slow", "In Progress", "High", "Auth", "2026-05-20", "John Doe", "Optimizing queries"],
        ["2", "Export CSV fails", "Closed", "Critical", "Reports", "2026-05-18", "Jane Smith", "Fixed encoding"],
        ["3", "Dark mode toggle", "On Hold", "Low", "UI", "2026-05-15", "Unassigned", "Waiting design"],
        ["4", "Data sync timeout", "Resolved", "High", "Sync", "2026-05-22", "Bob Johnson", "Timeout limit ↑"],
      ];
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          data: [
            {
              range: "'Sheet1'!A2:H5",
              values: exampleBugs,
            },
          ],
          valueInputOption: "RAW",
        },
      });
      
      console.log(`✓ Added ${exampleBugs.length} example bugs\n`);
    }
    
    // Step 5: Freeze header row
    console.log("🎨 Formatting sheet...\n");
    
    const sheetsResponse = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = sheetsResponse.data.sheets[0].properties.sheetId;
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              fields: "gridProperties.frozenRowCount",
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      },
    });
    
    console.log("✓ Froze header row\n");
    
    console.log("═".repeat(80));
    console.log("\n✨ Your bug tracking sheet is organized!\n");
    
    console.log("📊 Status Values for Column C:");
    console.log("  • Open");
    console.log("  • In Progress");
    console.log("  • Resolved");
    console.log("  • Closed");
    console.log("  • On Hold\n");
    
    console.log("📊 Priority Values for Column D:");
    console.log("  • Critical");
    console.log("  • High");
    console.log("  • Medium");
    console.log("  • Low\n");
    
    console.log("🔧 MCP Tool Commands:");
    console.log("  1. Add new bug:");
    console.log("     append_row('Sheet1!A:H', ['5', 'Bug Title', 'Open', 'High', 'Component', '2026-05-24', 'Name', 'Notes'])\n");
    console.log("  2. Update bug status:");
    console.log("     update_cell('Sheet1!C2', 'Resolved')\n");
    console.log("  3. Read all bugs:");
    console.log("     read_sheet('Sheet1!A1:H100')\n");
    
    console.log("✅ Check your Google Sheet now - it's organized!\n");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

organizeBugSheet();
