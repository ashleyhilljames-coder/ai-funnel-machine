import Database from 'better-sqlite3';
import * as path from 'path';

function inspectDatabase() {
  const dbPath = path.join(__dirname, '../../agentic_nexus.db');
  console.log("=========================================================================");
  console.log(`🔍 [Agentic Nexus] Database Inspector Utility`);
  console.log(`📁 Target File: ${dbPath}`);
  console.log("=========================================================================\n");

  try {
    const db = new Database(dbPath, { fileMustExist: true });

    // 1. Verify what tables exist inside the binary file schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    console.log(`📋 Active Database Tables Found: [${tables.map(t => t.name).join(', ')}]`);

    if (tables.length === 0) {
      console.log("❌ No tables have been provisioned in this database file yet.");
      return;
    }

    // 2. Count total records saved across all client campaigns
    const countResult = db.prepare("SELECT COUNT(*) as total FROM lead_registry").get() as { total: number };
    console.log(`🔢 Total Registered Leads Inhabiting Table: ${countResult.total}`);
    console.log("-------------------------------------------------------------------------");

    // 3. Extract and display the current records stored inside the table
    const records = db.prepare("SELECT id, email, client_id, global_block, processed_at FROM lead_registry ORDER BY id ASC").all() as any[];

    if (records.length === 0) {
      console.log("📭 The lead_registry table is currently empty.");
    } else {
      console.log(String.raw`📊 CURRENT DATABASE TABLE DUMP:`);
      console.table(
        records.map(r => ({
          ID: r.id,
          "Lead Email Address": r.email,
          "Assigned Client Workspace": r.client_id,
          "Global Block Flag": r.global_block === 1 ? "🔒 TRUE" : "🔓 FALSE",
          "Timestamp Saved": r.processed_at
        }))
      );
    }

  } catch (error: any) {
    console.error(`💥 Failed to inspect database: ${error.message}`);
  }
  console.log("\n=========================================================================");
}

inspectDatabase();