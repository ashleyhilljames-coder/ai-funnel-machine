import Database from 'better-sqlite3';
import * as path from 'path';

export class LeadGuard {
  private db: Database.Database;

  constructor() {
    // 💽 Sets up a single database binary file right in your root directory
    const dbPath = path.join(__dirname, '../../agentic_nexus.db');
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

 /**
   * Automatically provisions your relational schema structure on launch
   */
  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lead_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        client_id TEXT NOT NULL,
        global_block INTEGER DEFAULT 0,
        processed_at TEXT NOT NULL,
        UNIQUE(email, client_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_leads_lookup ON lead_registry(email, client_id);
    `);
  }

  /**
   * ULTRALIGHT INTERCEPT QUERY: Instantly checks database indexes for data isolation
   */
  public isDuplicateForClient(email: string, clientId: string): boolean {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    const cleanClient = clientId.toLowerCase().trim();

    // Look for a specific client record OR a global block lock on the email string
    const query = this.db.prepare(`
      SELECT 1 FROM lead_registry 
      WHERE email = ? AND (client_id = ? OR global_block = 1) 
      LIMIT 1
    `);
    
    const record = query.get(cleanEmail, cleanClient);
    return !!record; 
  }

  /**
   * Database Insertion: Reserves the lead strictly inside this client's profile partition
   */
  public registerClientLead(email: string, clientId: string, enforceGlobalBlock: boolean = false) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const cleanClient = clientId.toLowerCase().trim();
    const timestamp = new Date().toISOString();
    const globalBlockValue = enforceGlobalBlock ? 1 : 0;

    // Use a robust INSERT OR IGNORE statement to guard transaction thresholds safely
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO lead_registry (email, client_id, global_block, processed_at)
      VALUES (?, ?, ?, ?)
    `);

    insert.run(cleanEmail, cleanClient, globalBlockValue, timestamp);
  }
}