import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

async function readBugSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  
  try {
    // Try to read the first sheet with a broad range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Sheet1!A1:Z100", // Read a large range to capture all data
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log("❌ No data found in sheet");
      return;
    }

    console.log("✅ Successfully read Google Sheet:\n");
    console.log(`Total rows: ${rows.length}\n`);
    
    // Display all data
    rows.forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`, row.join(" | "));
    });

  } catch (error) {
    console.error("❌ Error reading sheet:", error.message);
    if (error.message.includes("PERMISSION_DENIED")) {
      console.log("\n💡 Tip: Make sure the service account has read access to the spreadsheet");
    }
  }
}

readBugSheet();
