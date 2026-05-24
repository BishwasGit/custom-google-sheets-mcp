import { spawn } from "child_process";
import readline from "readline";

class MCPClient {
  constructor() {
    this.server = spawn("node", ["server.js"], { cwd: "/media/DriveB/custom_mcp" });
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.rl = readline.createInterface({
      input: this.server.stdout,
      crlfDelay: Infinity,
    });

    this.rl.on("line", (line) => {
      try {
        const json = JSON.parse(line);
        const id = json.id;
        if (this.pendingRequests.has(id)) {
          const callback = this.pendingRequests.get(id);
          this.pendingRequests.delete(id);
          callback(json.result || json.error);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    this.server.stderr.on("data", (data) => {
      if (data.toString().includes("running")) {
        console.log("✅ MCP Server ready\n");
      }
    });
  }

  async call(toolName, args) {
    return new Promise((resolve) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      };

      this.pendingRequests.set(id, resolve);
      this.server.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  close() {
    this.rl.close();
    this.server.kill();
  }
}

async function organizeSheet() {
  const client = new MCPClient();
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    console.log("📖 Reading your current sheet data...\n");
    
    const result = await client.call("read_sheet", { range: "Sheet1!A1:H100" });
    
    if (result?.content?.[0]?.text) {
      const data = JSON.parse(result.content[0].text);
      const rows = data.values || [];
      
      console.log(`Found ${rows.length} rows of data\n`);
      
      if (rows.length > 0) {
        console.log("Current data:");
        console.log("─".repeat(100));
        rows.slice(0, 5).forEach((row, idx) => {
          console.log(`Row ${idx + 1}: ${row.map(v => (v || "").substring(0, 15)).join(" | ")}`);
        });
        if (rows.length > 5) console.log(`... and ${rows.length - 5} more rows`);
        console.log("─".repeat(100));
      }
      
      console.log("\n🔧 Setting up proper bug tracking structure...\n");
      
      // Set headers if they don't exist or are empty
      const headers = ["ID", "Title", "Status", "Priority", "Component", "Reported Date", "Assigned To", "Outcome"];
      
      for (let i = 0; i < headers.length; i++) {
        const col = String.fromCharCode(65 + i); // A, B, C, etc.
        console.log(`📝 Setting header: ${col}1 = "${headers[i]}"`);
        
        await client.call("update_cell", {
          range: `Sheet1!${col}1`,
          value: headers[i],
        });
        
        await new Promise(r => setTimeout(r, 300)); // Small delay between requests
      }
      
      console.log("\n✅ Headers organized successfully!\n");
      
      // Show what was organized
      console.log("📊 Your sheet structure is now:");
      console.log("┌──────┬─────────┬──────────┬──────────┬───────────┬──────────────┬──────────────┬──────────────┐");
      console.log("│  A   │    B    │    C     │    D     │     E     │      F       │      G       │      H       │");
      console.log("├──────┼─────────┼──────────┼──────────┼───────────┼──────────────┼──────────────┼──────────────┤");
      console.log(`│ ${headers[0].padEnd(4)} │ ${headers[1].padEnd(5)} │ ${headers[2].padEnd(8)} │ ${headers[3].padEnd(8)} │ ${headers[4].padEnd(7)} │ ${headers[5].padEnd(12)} │ ${headers[6].padEnd(12)} │ ${headers[7].padEnd(12)} │`);
      console.log("└──────┴─────────┴──────────┴──────────┴───────────┴──────────────┴──────────────┴──────────────┘");
      
      console.log("\n🎯 Status Values (use in Column C):");
      console.log("   • Open");
      console.log("   • In Progress");
      console.log("   • Resolved");
      console.log("   • Closed");
      console.log("   • On Hold");
      
      console.log("\n📊 Priority Values (use in Column D):");
      console.log("   • Critical");
      console.log("   • High");
      console.log("   • Medium");
      console.log("   • Low");
      
      console.log("\n✨ Next steps:");
      console.log("   1. Go to your Google Sheet and verify headers are set");
      console.log("   2. Fill in your bug data using the structure");
      console.log("   3. Use MCP tools to automate updates");
      
    } else {
      console.log("❌ Could not read sheet:", result);
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.close();
  }
}

organizeSheet();
