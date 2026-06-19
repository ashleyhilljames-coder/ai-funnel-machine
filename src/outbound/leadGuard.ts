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
        name TEXT DEFAULT '',
        niche TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        UNIQUE(email, client_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_leads_lookup ON lead_registry(email, client_id);

      CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        source TEXT NOT NULL,
        caller_name TEXT DEFAULT '',
        caller_phone TEXT DEFAULT '',
        caller_email TEXT DEFAULT '',
        caller_address TEXT DEFAULT '',
        damage_type TEXT DEFAULT '',
        transcript TEXT DEFAULT '',
        recording_path TEXT DEFAULT '',
        started_at TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        scheduled_dispatch TEXT DEFAULT '',
        agent_activity TEXT DEFAULT '',
        action_taken TEXT DEFAULT '',
        duration_seconds INTEGER DEFAULT 0,
        tokens_used INTEGER DEFAULT 0,
        dispatch_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_kb_client ON knowledge_base(client_id);

      CREATE TABLE IF NOT EXISTS client_settings (
        client_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        niche TEXT DEFAULT '',
        greeting TEXT DEFAULT '',
        chat_greeting TEXT DEFAULT '',
        hero_title TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        logo TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        primary_color TEXT DEFAULT '',
        primary_hover TEXT DEFAULT '',
        primary_glow TEXT DEFAULT '',
        secondary_color TEXT DEFAULT '',
        secondary_hover TEXT DEFAULT '',
        secondary_glow TEXT DEFAULT '',
        bg_primary TEXT DEFAULT '',
        bg_secondary TEXT DEFAULT '',
        slack_webhook_url TEXT DEFAULT '',
        notification_phone TEXT DEFAULT '',
        notify_on_lead INTEGER DEFAULT 1,
        google_sheet_id TEXT DEFAULT '',
        google_calendar_id TEXT DEFAULT '',
        twilio_account_sid TEXT DEFAULT '',
        twilio_auth_token TEXT DEFAULT '',
        twilio_phone_number TEXT DEFAULT '',
        resend_api_key TEXT DEFAULT '',
        voice_instructions TEXT DEFAULT '',
        voice_tone TEXT DEFAULT 'alloy',
        password TEXT DEFAULT 'password123',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_ledger (
        invoice_id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'paid',
        voice_minutes REAL NOT NULL,
        tokens_used INTEGER NOT NULL,
        dispatches INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS outbound_templates (
        id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        subject_template TEXT NOT NULL,
        body_prompt TEXT NOT NULL,
        is_static INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (id, client_id)
      );

      CREATE TABLE IF NOT EXISTS outreach_logs (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Run migrations for existing databases
    try {
      this.db.exec(`ALTER TABLE lead_registry ADD COLUMN name TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE lead_registry ADD COLUMN niche TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE lead_registry ADD COLUMN status TEXT DEFAULT 'pending'`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN scheduled_dispatch TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN agent_activity TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN action_taken TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN duration_seconds INTEGER DEFAULT 0`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN tokens_used INTEGER DEFAULT 0`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE call_logs ADD COLUMN dispatch_count INTEGER DEFAULT 0`);
    } catch (e) {}

    // Alter client_settings for Stripe features
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN stripe_customer_id TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN subscription_status TEXT DEFAULT 'inactive'`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN stripe_card_brand TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN stripe_card_last4 TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN slack_webhook_url TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN notification_phone TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN notify_on_lead INTEGER DEFAULT 1`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN google_sheet_id TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN google_calendar_id TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN twilio_account_sid TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN twilio_auth_token TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN twilio_phone_number TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN resend_api_key TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN voice_instructions TEXT DEFAULT ''`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN voice_tone TEXT DEFAULT 'alloy'`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE client_settings ADD COLUMN password TEXT DEFAULT 'password123'`);
    } catch (e) {}
    try {
      // Update existing records with correct default passwords
      this.db.prepare("UPDATE client_settings SET password = 'restoration123' WHERE client_id = 'restoration_lv'").run();
      this.db.prepare("UPDATE client_settings SET password = 'roofing123' WHERE client_id = 'roofing_sc'").run();
      this.db.prepare("UPDATE client_settings SET password = 'property123' WHERE client_id = 'property_apex'").run();
      this.db.prepare("UPDATE client_settings SET password = 'realestate123' WHERE client_id = 'realestate_nexus'").run();
    } catch (e) {}

    // Seed mock data if tables are empty
    try {
      const leadsCount = this.db.prepare("SELECT count(*) as count FROM lead_registry").get() as { count: number };
      if (leadsCount && leadsCount.count === 0) {
        console.log("🌱 Database is empty. Seeding realistic multi-tenant mock data...");
        this.seedMockData();
      }
    } catch (err: any) {
      console.error("❌ Seeding failed:", err.message);
    }

    try {
      const settingsCount = this.db.prepare("SELECT count(*) as count FROM client_settings").get() as { count: number };
      if (settingsCount && settingsCount.count === 0) {
        console.log("🌱 Client settings table is empty. Seeding default branding and configurations...");
        this.seedDefaultClientSettings();
      }
    } catch (err: any) {
      console.error("❌ Client settings seeding failed:", err.message);
    }

    try {
      const invoiceCount = this.db.prepare("SELECT count(*) as count FROM invoice_ledger").get() as { count: number };
      if (invoiceCount && invoiceCount.count === 0) {
        console.log("🌱 Invoice ledger table is empty. Seeding default historical invoices...");
        this.seedDefaultInvoices();
      }
    } catch (err: any) {
      console.error("❌ Invoice ledger seeding failed:", err.message);
    }

    try {
      const templatesCount = this.db.prepare("SELECT count(*) as count FROM outbound_templates").get() as { count: number };
      if (templatesCount && templatesCount.count === 0) {
        console.log("🌱 Outbound templates table is empty. Seeding default templates...");
        this.seedDefaultTemplates();
      }
    } catch (err: any) {
      console.error("❌ Outbound templates seeding failed:", err.message);
    }
  }


  private seedMockData() {
    const insertLead = this.db.prepare(`
      INSERT INTO lead_registry (email, client_id, global_block, processed_at, name, niche, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCall = this.db.prepare(`
      INSERT INTO call_logs (id, client_id, source, caller_name, caller_phone, caller_email, caller_address, damage_type, transcript, recording_path, started_at, duration, scheduled_dispatch, agent_activity, action_taken, duration_seconds, tokens_used, dispatch_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

    // Restoration Pro Las Vegas leads
    insertLead.run("john.miller@gmail.com", "restoration_lv", 0, subHours(2), "John Miller", "Water Damage", "pending");
    insertLead.run("sarah.connor@yahoo.com", "restoration_lv", 0, subHours(5), "Sarah Connor", "Fire Damage", "contacted");
    insertLead.run("robert.davis@outlook.com", "restoration_lv", 0, subHours(24), "Robert Davis", "Mold Infestation", "contacted");
    insertLead.run("duplicate.restoration@gmail.com", "restoration_lv", 1, subHours(3), "Duplicate Lead", "Water Damage", "pending");

    // Sin City Roof Crew leads
    insertLead.run("mark.stevens@gmail.com", "roofing_sc", 0, subHours(1), "Mark Stevens", "Storm / Roof Leak", "pending");
    insertLead.run("linda.taylor@hotmail.com", "roofing_sc", 0, subHours(8), "Linda Taylor", "Storm / Roof Leak", "contacted");
    insertLead.run("james.wilson@live.com", "roofing_sc", 1, subHours(4), "James Wilson", "Storm / Roof Leak", "pending");

    // Apex Property Management leads
    insertLead.run("kevin.malone@dundermifflin.com", "property_apex", 0, subHours(12), "Kevin Malone", "General Restoration", "pending");
    insertLead.run("angela.martin@outlook.com", "property_apex", 0, subHours(18), "Angela Martin", "General Restoration", "contacted");

    // Nexus Realty Group leads (Real Estate Niche)
    insertLead.run("sarah.realty@gmail.com", "realestate_nexus", 0, subHours(4), "Sarah Connor", "Residential Property", "contacted");
    insertLead.run("mike.t@outlook.com", "realestate_nexus", 0, subHours(9), "Mike T.", "Residential Property", "contacted");

    // Call logs
    insertCall.run(
      "call_seed_1",
      "restoration_lv",
      "web_chat",
      "John Miller",
      "+17025550101",
      "john.miller@gmail.com",
      "789 Las Vegas Blvd, Las Vegas, NV",
      "Water Damage",
      "[AI]: Hello! Thank you for calling Restoration Pro Las Vegas. Can I get your full name, please?\n[User]: Yeah, my name is John Miller.\n[AI]: Thanks, John. What is the emergency today?\n[User]: My washing machine hose burst, and there is standing water in my hallway.\n[AI]: Oh dear, that is urgent. I will schedule a mitigation crew to head out. Let's book your dispatch.",
      "",
      subHours(2),
      78,
      "Monday, Jun 15 at 10:00 AM",
      "Identified: Water Damage Pipe Burst. Scheduled emergency crew.",
      "[Dispatched - FieldPulse]",
      78,
      1250,
      1
    );

    insertCall.run(
      "call_seed_2",
      "restoration_lv",
      "browser",
      "Robert Davis",
      "+17025550103",
      "robert.davis@outlook.com",
      "123 Fremont St, Las Vegas, NV",
      "Mold Infestation",
      "[AI]: Hello! Thank you for calling Restoration Pro Las Vegas. Can I get your full name, please?\n[User]: Robert Davis.\n[AI]: Thank you, Robert. Can you describe the issue?\n[User]: I noticed black mold in my bathroom wall after a water leak.\n[AI]: We can definitely get a mitigation inspector out to check that structural mold.",
      "",
      subHours(24),
      92,
      "Monday, Jun 15 at 2:00 PM",
      "Qualified: Inbound web request. Structural mold concerns.",
      "[CRM Sync - KVCore]",
      92,
      2800,
      1
    );

    insertCall.run(
      "call_seed_3",
      "roofing_sc",
      "telephony",
      "Linda Taylor",
      "+17025550202",
      "linda.taylor@hotmail.com",
      "456 Sunset Rd, Henderson, NV",
      "Storm / Roof Leak",
      "[AI]: Hello! Thank you for calling Sin City Roof Crew. Can I get your full name, please?\n[User]: Linda Taylor.\n[AI]: Thanks, Linda. How can we help you?\n[User]: A storm blew some shingles off, and now water is dripping into my living room ceiling.\n[AI]: I understand, let's get a tarping specialist out to seal that leak.",
      "",
      subHours(8),
      65,
      "Monday, Jun 15 at 11:00 AM",
      "Qualified: Storm blew shingles off, water dripping. Scheduled emergency tarping.",
      "[Dispatched]",
      65,
      950,
      1
    );

    insertCall.run(
      "call_seed_4",
      "property_apex",
      "browser",
      "Angela Martin",
      "+17025550303",
      "angela.martin@outlook.com",
      "789 Apartment A, Las Vegas, NV",
      "General Restoration",
      "[AI]: Hello! Thank you for calling Apex Property Management emergencies line. Can I get your full name, please?\n[User]: Angela Martin.\n[AI]: Thanks, Angela. What emergency repair do you need?\n[User]: The kitchen sink pipe is leaking heavily underneath the cabinet.\n[AI]: I will schedule a plumber to visit your unit.",
      "",
      subHours(18),
      84,
      "Monday, Jun 15 at 1:00 PM",
      "Qualified: Kitchen sink pipe leaking heavily. Plumber dispatch requested.",
      "[CRM Sync - Lofty]",
      84,
      1800,
      1
    );

    insertCall.run(
      "call_seed_5",
      "realestate_nexus",
      "sms",
      "Sarah Connor",
      "+17025550404",
      "sarah.connor@yahoo.com",
      "456 Oak St, Las Vegas, NV",
      "Residential Property",
      "[AI]: Hello! Thank you for contacting Nexus Realty Group. Can I get your full name, please?\n[User]: Sarah Connor.\n[AI]: Hi Sarah! Are you looking to buy, sell, or rent?\n[User]: I'm looking to buy a 3B/2B house, budget is around $450k.\n[AI]: Perfect. I've synced your criteria to our CRM. Let's schedule a tour on Calendly.",
      "",
      subHours(5),
      112,
      "Tuesday, Jun 16 at 3:00 PM",
      "Qualified: Looking for 3B/2B. Budget $450k. Booked Tour.",
      "[Booked - Calendly]",
      112,
      3200,
      1
    );
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
  public registerClientLead(
    email: string,
    clientId: string,
    enforceGlobalBlock: boolean = false,
    name: string = '',
    niche: string = ''
  ) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const cleanClient = clientId.toLowerCase().trim();
    const timestamp = new Date().toISOString();
    const globalBlockValue = enforceGlobalBlock ? 1 : 0;

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO lead_registry (email, client_id, global_block, processed_at, name, niche, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    insert.run(cleanEmail, cleanClient, globalBlockValue, timestamp, name, niche);
  }

  /**
   * Retrieves all registered leads in descending order of ingestion.
   */
  public getAllRegisteredLeads(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      if (isClient) {
        const query = this.db.prepare(`
          SELECT id, email, client_id, global_block, processed_at, name, niche, status 
          FROM lead_registry 
          WHERE client_id = ?
          ORDER BY processed_at DESC
        `);
        return query.all(clientId.toLowerCase().trim()) as Array<{
          id: number;
          email: string;
          client_id: string;
          global_block: number;
          processed_at: string;
          name: string;
          niche: string;
          status: string;
        }>;
      }
      const query = this.db.prepare(`
        SELECT id, email, client_id, global_block, processed_at, name, niche, status 
        FROM lead_registry 
        ORDER BY processed_at DESC
      `);
      return query.all() as Array<{
        id: number;
        email: string;
        client_id: string;
        global_block: number;
        processed_at: string;
        name: string;
        niche: string;
        status: string;
      }>;
    } catch (err) {
      console.error("❌ Failed to query lead registry:", err);
      return [];
    }
  }

  /**
   * Updates the campaign status for a registered lead.
   */
  public updateLeadStatus(email: string, clientId: string, status: string) {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanClient = clientId.toLowerCase().trim();
      const update = this.db.prepare(`
        UPDATE lead_registry 
        SET status = ? 
        WHERE email = ? AND client_id = ?
      `);
      update.run(status, cleanEmail, cleanClient);
      return true;
    } catch (err) {
      console.error("❌ Failed to update lead status:", err);
      throw err;
    }
  }

  public getStats(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      const clientVal = isClient ? clientId.toLowerCase().trim() : '';

      const totalQuery = isClient 
        ? this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE client_id = ?")
        : this.db.prepare("SELECT COUNT(*) as count FROM lead_registry");
      const total = isClient ? totalQuery.get(clientVal) : totalQuery.get();

      const globalBlocksQuery = isClient
        ? this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE global_block = 1 AND client_id = ?")
        : this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE global_block = 1");
      const globalBlocks = isClient ? globalBlocksQuery.get(clientVal) : globalBlocksQuery.get();

      const totalCallsQuery = isClient
        ? this.db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE client_id = ?")
        : this.db.prepare("SELECT COUNT(*) as count FROM call_logs");
      const totalCalls = isClient ? totalCallsQuery.get(clientVal) : totalCallsQuery.get();

      const scheduledDispatchesQuery = isClient
        ? this.db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE (scheduled_dispatch IS NOT NULL AND scheduled_dispatch != '') AND client_id = ?")
        : this.db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE scheduled_dispatch IS NOT NULL AND scheduled_dispatch != ''");
      const scheduledDispatches = isClient ? scheduledDispatchesQuery.get(clientVal) : scheduledDispatchesQuery.get();

      const outreachDispatchedQuery = isClient
        ? this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE status = 'contacted' AND client_id = ?")
        : this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE status = 'contacted'");
      const outreachDispatched = isClient ? outreachDispatchedQuery.get(clientVal) : outreachDispatchedQuery.get();

      const damageTypesQuery = isClient
        ? this.db.prepare("SELECT damage_type as type, COUNT(*) as count FROM call_logs WHERE (damage_type IS NOT NULL AND damage_type != '') AND client_id = ? GROUP BY damage_type")
        : this.db.prepare("SELECT damage_type as type, COUNT(*) as count FROM call_logs WHERE damage_type IS NOT NULL AND damage_type != '' GROUP BY damage_type");
      const damageTypesRaw = isClient ? damageTypesQuery.all(clientVal) : damageTypesQuery.all();

      const damageTypes: Record<string, number> = {};
      damageTypesRaw.forEach((row: any) => {
        damageTypes[row.type] = row.count;
      });

      return {
        totalLeads: (total as { count: number })?.count || 0,
        globalBlocks: (globalBlocks as { count: number })?.count || 0,
        totalCalls: (totalCalls as { count: number })?.count || 0,
        scheduledDispatches: (scheduledDispatches as { count: number })?.count || 0,
        outreachDispatched: (outreachDispatched as { count: number })?.count || 0,
        damageTypes
      };
    } catch (err) {
      console.error("❌ Failed to query statistics:", err);
      return {
        totalLeads: 0,
        globalBlocks: 0,
        totalCalls: 0,
        scheduledDispatches: 0,
        outreachDispatched: 0,
        damageTypes: {}
      };
    }
  }

  public getAnalyticsData(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      const clientVal = isClient ? clientId.toLowerCase().trim() : 'all';

      // 1. Generate the last 14 dates (YYYY-MM-DD)
      const dates: string[] = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }

      // Start date is 14 days ago at midnight local time
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
      const startIso = startDate.toISOString();

      // 2. Fetch daily leads (grouped by date)
      const leadsQuery = this.db.prepare(`
        SELECT strftime('%Y-%m-%d', processed_at) as date, COUNT(*) as count
        FROM lead_registry
        WHERE (client_id = ? OR ? = 'all')
          AND processed_at >= ?
          AND global_block = 0
        GROUP BY date
      `);
      const leadsRaw = leadsQuery.all(clientVal, clientVal, startIso) as any[];

      // 3. Fetch daily duplicate blocks
      const blocksQuery = this.db.prepare(`
        SELECT strftime('%Y-%m-%d', processed_at) as date, COUNT(*) as count
        FROM lead_registry
        WHERE (client_id = ? OR ? = 'all')
          AND processed_at >= ?
          AND global_block = 1
        GROUP BY date
      `);
      const blocksRaw = blocksQuery.all(clientVal, clientVal, startIso) as any[];

      // 4. Fetch daily conversations by channel (source)
      const convsQuery = this.db.prepare(`
        SELECT strftime('%Y-%m-%d', started_at) as date, source, COUNT(*) as count
        FROM call_logs
        WHERE (client_id = ? OR ? = 'all')
          AND started_at >= ?
        GROUP BY date, source
      `);
      const convsRaw = convsQuery.all(clientVal, clientVal, startIso) as any[];

      // 5. Fetch daily costs metrics
      const billingQuery = this.db.prepare(`
        SELECT strftime('%Y-%m-%d', started_at) as date,
               SUM(duration_seconds) as duration,
               SUM(tokens_used) as tokens,
               SUM(dispatch_count) as dispatches
        FROM call_logs
        WHERE (client_id = ? OR ? = 'all')
          AND started_at >= ?
        GROUP BY date
      `);
      const billingRaw = billingQuery.all(clientVal, clientVal, startIso) as any[];

      // 6. Aggregate results by date label
      const dailyLeads: Record<string, number> = {};
      const dailyBlocks: Record<string, number> = {};
      const dailyConvs: Record<string, number> = {};
      
      // Breakdown channels: 'voice', 'chat', 'sms'
      const channelConvs: Record<string, Record<string, number>> = {};

      const dailyBilling: Record<string, { voice: number; token: number; dispatch: number }> = {};

      // Initialize maps with 0 values
      dates.forEach(d => {
        dailyLeads[d] = 0;
        dailyBlocks[d] = 0;
        dailyConvs[d] = 0;
        channelConvs[d] = { voice: 0, chat: 0, sms: 0 };
        dailyBilling[d] = { voice: 0, token: 0, dispatch: 0 };
      });

      // Populate raw values
      leadsRaw.forEach(row => {
        if (row.date && dailyLeads[row.date] !== undefined) {
          dailyLeads[row.date] = row.count;
        }
      });

      blocksRaw.forEach(row => {
        if (row.date && dailyBlocks[row.date] !== undefined) {
          dailyBlocks[row.date] = row.count;
        }
      });

      convsRaw.forEach(row => {
        if (row.date && dailyConvs[row.date] !== undefined) {
          dailyConvs[row.date] += row.count;
          
          // Map source to voice, chat, sms
          const src = (row.source || '').toLowerCase();
          let key = 'voice';
          if (src.includes('chat') || src.includes('web')) {
            key = 'chat';
          } else if (src.includes('sms')) {
            key = 'sms';
          } else if (src.includes('browser') || src.includes('telephony')) {
            key = 'voice';
          }
          if (channelConvs[row.date]) {
            channelConvs[row.date][key] += row.count;
          }
        }
      });

      billingRaw.forEach(row => {
        if (row.date && dailyBilling[row.date] !== undefined) {
          const dur = parseFloat(row.duration || 0);
          const tok = parseInt(row.tokens || 0);
          const disp = parseInt(row.dispatches || 0);

          dailyBilling[row.date] = {
            voice: parseFloat((dur / 60 * 0.15).toFixed(4)),
            token: parseFloat((tok * 0.00003).toFixed(4)),
            dispatch: disp * 10.0
          };
        }
      });

      // 7. Calculate funnel aggregations (overall in active client context)
      const totalConvs = this.db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE (client_id = ? OR ? = 'all')").get(clientVal, clientVal) as { count: number };
      const qLeads = this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE (client_id = ? OR ? = 'all') AND global_block = 0").get(clientVal, clientVal) as { count: number };
      const dBlocks = this.db.prepare("SELECT COUNT(*) as count FROM lead_registry WHERE (client_id = ? OR ? = 'all') AND global_block = 1").get(clientVal, clientVal) as { count: number };
      const bAppts = this.db.prepare("SELECT COUNT(*) as count FROM call_logs WHERE (client_id = ? OR ? = 'all') AND (scheduled_dispatch IS NOT NULL AND scheduled_dispatch != '')").get(clientVal, clientVal) as { count: number };

      return {
        dates,
        trends: {
          leads: dates.map(d => dailyLeads[d]),
          blocks: dates.map(d => dailyBlocks[d]),
          conversations: dates.map(d => dailyConvs[d]),
          channels: {
            voice: dates.map(d => channelConvs[d].voice),
            chat: dates.map(d => channelConvs[d].chat),
            sms: dates.map(d => channelConvs[d].sms)
          }
        },
        billing: {
          voice: dates.map(d => dailyBilling[d].voice),
          token: dates.map(d => dailyBilling[d].token),
          dispatch: dates.map(d => dailyBilling[d].dispatch)
        },
        funnel: {
          conversations: totalConvs?.count || 0,
          qualified: qLeads?.count || 0,
          blocked: dBlocks?.count || 0,
          booked: bAppts?.count || 0
        }
      };

    } catch (err) {
      console.error("❌ Failed to query analytics trends:", err);
      throw err;
    }
  }
  /**
   * Clears all entries from the duplicate guard registry.
   */
  public clearRegistry() {
    try {
      this.db.exec("DELETE FROM lead_registry");
      this.db.exec("DELETE FROM call_logs");
      console.log("🧹 Lead duplicate registry and call logs cleared.");
      return true;
    } catch (err) {
      console.error("❌ Failed to clear lead registry:", err);
      throw err;
    }
  }

  /**
   * Adds an initial call log entry at the start of a conversation.
   */
  public createCallLog(id: string, source: string, clientId: string = 'default_client') {
    try {
      const timestamp = new Date().toISOString();
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO call_logs (id, client_id, source, started_at)
        VALUES (?, ?, ?, ?)
      `);
      insert.run(id, clientId, source, timestamp);
    } catch (err) {
      console.error("❌ Failed to create call log:", err);
    }
  }

  /**
   * Updates an existing call log entry with transcript, recording, and client details.
   */
  public updateCallLog(
    id: string,
    data: {
      callerName?: string;
      callerPhone?: string;
      callerEmail?: string;
      callerAddress?: string;
      damageType?: string;
      transcript?: string;
      recordingPath?: string;
      duration?: number;
      scheduledDispatch?: string;
      agentActivity?: string;
      actionTaken?: string;
      durationSeconds?: number;
      tokensUsed?: number;
      dispatchCount?: number;
    }
  ) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      
      if (data.callerName !== undefined) { fields.push('caller_name = ?'); values.push(data.callerName); }
      if (data.callerPhone !== undefined) { fields.push('caller_phone = ?'); values.push(data.callerPhone); }
      if (data.callerEmail !== undefined) { fields.push('caller_email = ?'); values.push(data.callerEmail); }
      if (data.callerAddress !== undefined) { fields.push('caller_address = ?'); values.push(data.callerAddress); }
      if (data.damageType !== undefined) { fields.push('damage_type = ?'); values.push(data.damageType); }
      if (data.transcript !== undefined) { fields.push('transcript = ?'); values.push(data.transcript); }
      if (data.recordingPath !== undefined) { fields.push('recording_path = ?'); values.push(data.recordingPath); }
      if (data.duration !== undefined) { fields.push('duration = ?'); values.push(data.duration); }
      if (data.scheduledDispatch !== undefined) { fields.push('scheduled_dispatch = ?'); values.push(data.scheduledDispatch); }
      if (data.agentActivity !== undefined) { fields.push('agent_activity = ?'); values.push(data.agentActivity); }
      if (data.actionTaken !== undefined) { fields.push('action_taken = ?'); values.push(data.actionTaken); }
      if (data.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(data.durationSeconds); }
      if (data.tokensUsed !== undefined) { fields.push('tokens_used = ?'); values.push(data.tokensUsed); }
      if (data.dispatchCount !== undefined) { fields.push('dispatch_count = ?'); values.push(data.dispatchCount); }
      
      if (fields.length === 0) return;
      
      values.push(id);
      const update = this.db.prepare(`
        UPDATE call_logs 
        SET ${fields.join(', ')} 
        WHERE id = ?
      `);
      update.run(...values);
    } catch (err) {
      console.error("❌ Failed to update call log:", err);
    }
  }

  /**
   * Retrieves all call logs in descending chronological order.
   */
  public getAllCallLogs(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      if (isClient) {
        const query = this.db.prepare(`
          SELECT id, client_id, source, caller_name, caller_phone, caller_email, caller_address, damage_type, transcript, recording_path, started_at, duration, scheduled_dispatch, agent_activity, action_taken, duration_seconds, tokens_used, dispatch_count 
          FROM call_logs 
          WHERE client_id = ?
          ORDER BY started_at DESC
        `);
        return query.all(clientId.toLowerCase().trim()) as Array<{
          id: string;
          client_id: string;
          source: string;
          caller_name: string;
          caller_phone: string;
          caller_email: string;
          caller_address: string;
          damage_type: string;
          transcript: string;
          recording_path: string;
          started_at: string;
          duration: number;
          scheduled_dispatch: string;
          agent_activity: string;
          action_taken: string;
          duration_seconds: number;
          tokens_used: number;
          dispatch_count: number;
        }>;
      }
      const query = this.db.prepare(`
        SELECT id, client_id, source, caller_name, caller_phone, caller_email, caller_address, damage_type, transcript, recording_path, started_at, duration, scheduled_dispatch, agent_activity, action_taken, duration_seconds, tokens_used, dispatch_count 
        FROM call_logs 
        ORDER BY started_at DESC
      `);
      return query.all() as Array<{
        id: string;
        client_id: string;
        source: string;
        caller_name: string;
        caller_phone: string;
        caller_email: string;
        caller_address: string;
        damage_type: string;
        transcript: string;
        recording_path: string;
        started_at: string;
        duration: number;
        scheduled_dispatch: string;
        agent_activity: string;
        action_taken: string;
        duration_seconds: number;
        tokens_used: number;
        dispatch_count: number;
      }>;
    } catch (err) {
      console.error("❌ Failed to query call logs:", err);
      return [];
    }
  }

  /**
   * Save a single chunk of text and its vector embedding
   */
  public insertKnowledgeChunk(clientId: string, filename: string, content: string, embedding: number[]) {
    try {
      const timestamp = new Date().toISOString();
      const embeddingStr = JSON.stringify(embedding);
      const insert = this.db.prepare(`
        INSERT INTO knowledge_base (client_id, filename, content, embedding, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      insert.run(clientId.toLowerCase().trim(), filename, content, embeddingStr, timestamp);
    } catch (err) {
      console.error("❌ Failed to insert knowledge chunk:", err);
      throw err;
    }
  }

  /**
   * Retrieve all knowledge base chunks and embeddings for a client
   */
  public getKnowledgeBase(clientId: string) {
    try {
      const query = this.db.prepare(`
        SELECT content, embedding 
        FROM knowledge_base 
        WHERE client_id = ?
      `);
      const rows = query.all(clientId.toLowerCase().trim()) as Array<{ content: string; embedding: string }>;
      return rows.map(r => ({
        content: r.content,
        embedding: JSON.parse(r.embedding) as number[]
      }));
    } catch (err) {
      console.error("❌ Failed to retrieve knowledge base:", err);
      return [];
    }
  }

  /**
   * Delete all chunks associated with a file for a specific client
   */
  public deleteKnowledgeBaseFile(clientId: string, filename: string) {
    try {
      const del = this.db.prepare(`
        DELETE FROM knowledge_base 
        WHERE client_id = ? AND filename = ?
      `);
      del.run(clientId.toLowerCase().trim(), filename);
      return true;
    } catch (err) {
      console.error("❌ Failed to delete knowledge base file:", err);
      throw err;
    }
  }

  /**
   * Retrieve unique filenames and chunk counts for a client
   */
  public getKnowledgeBaseFiles(clientId: string) {
    try {
      const query = this.db.prepare(`
        SELECT filename, COUNT(*) as chunk_count 
        FROM knowledge_base 
        WHERE client_id = ? 
        GROUP BY filename
      `);
      return query.all(clientId.toLowerCase().trim()) as Array<{ filename: string; chunk_count: number }>;
    } catch (err) {
      console.error("❌ Failed to retrieve knowledge base files:", err);
      return [];
    }
  }

  /**
   * Helper to simulate a metered call log safely from within LeadGuard.
   */
  public simulateCallLog(clientId: string, callerName: string, duration: number, tokens: number, dispatch: number) {
    try {
      const randId = `sim_${Math.random().toString(36).substring(2, 10)}`;
      const source = Math.random() > 0.5 ? 'browser' : 'telephony';
      const date = new Date().toISOString();

      const insert = this.db.prepare(`
        INSERT INTO call_logs (id, client_id, source, caller_name, caller_phone, caller_email, caller_address, damage_type, transcript, recording_path, started_at, duration, scheduled_dispatch, agent_activity, action_taken, duration_seconds, tokens_used, dispatch_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        randId,
        clientId,
        source,
        callerName,
        '+17025559999',
        `${callerName.toLowerCase().replace(' ', '.')}@dundermifflin.com`,
        '1725 Slough Avenue, Scranton, PA',
        'Water Damage',
        '[AI]: Help is on the way!\n[User]: Thanks a lot.',
        '',
        date,
        duration,
        dispatch ? 'Monday, Jun 15 at 10:00 AM' : '',
        dispatch ? 'Dispatched Technician via FieldPulse' : 'Logged Inquiry in CRM',
        dispatch ? '[Dispatched - FieldPulse]' : '[CRM Sync - KVCore]',
        duration,
        tokens,
        dispatch
      );
      return true;
    } catch (err) {
      console.error("❌ Failed to simulate call log:", err);
      throw err;
    }
  }

  /**
   * Retrieves styling and configuration settings for a client
   */
  public getClientSettings(clientId: string) {
    try {
      const cleanId = clientId.toLowerCase().trim();
      const row = this.db.prepare("SELECT * FROM client_settings WHERE client_id = ?").get(cleanId) as any;
      if (row) {
        return {
          name: row.name,
          niche: row.niche,
          greeting: row.greeting,
          chatGreeting: row.chat_greeting,
          heroTitle: row.hero_title,
          subtitle: row.subtitle,
          logo: row.logo,
          phone: row.phone,
          primaryColor: row.primary_color,
          primaryHover: row.primary_hover,
          primaryGlow: row.primary_glow,
          secondaryColor: row.secondary_color,
          secondaryHover: row.secondary_hover,
          secondaryGlow: row.secondary_glow,
          bgPrimary: row.bg_primary,
          bgSecondary: row.bg_secondary,
          stripeCustomerId: row.stripe_customer_id || "",
          subscriptionStatus: row.subscription_status || "inactive",
          stripeCardBrand: row.stripe_card_brand || "",
          stripeCardLast4: row.stripe_card_last4 || "",
          slackWebhookUrl: row.slack_webhook_url || "",
          notificationPhone: row.notification_phone || "",
          notifyOnLead: row.notify_on_lead !== undefined ? row.notify_on_lead : 1,
          googleSheetId: row.google_sheet_id || "",
          googleCalendarId: row.google_calendar_id || "",
          twilioAccountSid: row.twilio_account_sid || "",
          twilioAuthToken: row.twilio_auth_token || "",
          twilioPhoneNumber: row.twilio_phone_number || "",
          resendApiKey: row.resend_api_key || "",
          voiceInstructions: row.voice_instructions || "",
          voiceTone: row.voice_tone || "alloy"
        };
      }
      return null;
    } catch (err) {
      console.error("❌ Failed to query client settings:", err);
      return null;
    }
  }

  /**
   * Saves or updates styling and configurations for a client
   */
  public saveClientSettings(clientId: string, settings: any) {
    try {
      const cleanId = clientId.toLowerCase().trim();
      const now = new Date().toISOString();
      
      const upsert = this.db.prepare(`
        INSERT INTO client_settings (
          client_id, name, niche, greeting, chat_greeting, hero_title, subtitle, logo, phone,
          primary_color, primary_hover, primary_glow, secondary_color, secondary_hover, secondary_glow,
          bg_primary, bg_secondary, slack_webhook_url, notification_phone, notify_on_lead,
          google_sheet_id, google_calendar_id, twilio_account_sid, twilio_auth_token, twilio_phone_number, resend_api_key,
          voice_instructions, voice_tone, password, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(client_id) DO UPDATE SET
          name = excluded.name,
          niche = excluded.niche,
          greeting = excluded.greeting,
          chat_greeting = excluded.chat_greeting,
          hero_title = excluded.hero_title,
          subtitle = excluded.subtitle,
          logo = excluded.logo,
          phone = excluded.phone,
          primary_color = excluded.primary_color,
          primary_hover = excluded.primary_hover,
          primary_glow = excluded.primary_glow,
          secondary_color = excluded.secondary_color,
          secondary_hover = excluded.secondary_hover,
          secondary_glow = excluded.secondary_glow,
          bg_primary = excluded.bg_primary,
          bg_secondary = excluded.bg_secondary,
          slack_webhook_url = excluded.slack_webhook_url,
          notification_phone = excluded.notification_phone,
          notify_on_lead = excluded.notify_on_lead,
          google_sheet_id = excluded.google_sheet_id,
          google_calendar_id = excluded.google_calendar_id,
          twilio_account_sid = excluded.twilio_account_sid,
          twilio_auth_token = excluded.twilio_auth_token,
          twilio_phone_number = excluded.twilio_phone_number,
          resend_api_key = excluded.resend_api_key,
          voice_instructions = excluded.voice_instructions,
          voice_tone = excluded.voice_tone,
          password = excluded.password,
          updated_at = excluded.updated_at
      `);

      upsert.run(
        cleanId,
        settings.name,
        settings.niche || "",
        settings.greeting || "",
        settings.chatGreeting || "",
        settings.heroTitle || "",
        settings.subtitle || "",
        settings.logo || "",
        settings.phone || "",
        settings.primaryColor || "",
        settings.primaryHover || "",
        settings.primaryGlow || "",
        settings.secondaryColor || "",
        settings.secondaryHover || "",
        settings.secondaryGlow || "",
        settings.bgPrimary || "",
        settings.bgSecondary || "",
        settings.slackWebhookUrl || "",
        settings.notificationPhone || "",
        settings.notifyOnLead !== undefined ? settings.notifyOnLead : 1,
        settings.googleSheetId || "",
        settings.googleCalendarId || "",
        settings.twilioAccountSid || "",
        settings.twilioAuthToken || "",
        settings.twilioPhoneNumber || "",
        settings.resendApiKey || "",
        settings.voiceInstructions || "",
        settings.voiceTone || "alloy",
        settings.password || (cleanId + "123"),
        now
      );
    } catch (err) {
      console.error("❌ Failed to save client settings:", err);
      throw err;
    }
  }

  /**
   * Verifies client settings password or global admin credentials
   */
  public verifyClientCredentials(clientId: string, password?: string): boolean {
    try {
      const cleanId = clientId.toLowerCase().trim();
      const cleanPassword = (password || '').trim();

      if (cleanId === 'admin') {
        const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();
        return cleanPassword === adminPassword;
      }

      const row = this.db.prepare("SELECT password FROM client_settings WHERE client_id = ?").get(cleanId) as any;
      if (row) {
        return row.password === cleanPassword;
      }
      return cleanPassword === (cleanId + '123');
    } catch (err) {
      console.error("❌ Failed to verify client credentials:", err);
      return false;
    }
  }

  /**
   * Updates Stripe subscription details for a client
   */
  public updateStripeSubscription(clientId: string, status: string, customerId: string, cardBrand: string, cardLast4: string) {
    try {
      const cleanId = clientId.toLowerCase().trim();
      const now = new Date().toISOString();
      this.db.prepare(`
        UPDATE client_settings 
        SET subscription_status = ?, stripe_customer_id = ?, stripe_card_brand = ?, stripe_card_last4 = ?, updated_at = ?
        WHERE client_id = ?
      `).run(status, customerId, cardBrand, cardLast4, now, cleanId);
      console.log(`💳 [Stripe DB] Updated subscription status for "${cleanId}" to "${status}"`);
    } catch (err) {
      console.error("❌ Failed to update Stripe subscription in DB:", err);
      throw err;
    }
  }

  /**
   * Gets historical invoices for a client
   */
  public getInvoices(clientId: string) {
    try {
      const cleanId = clientId.toLowerCase().trim();
      return this.db.prepare("SELECT * FROM invoice_ledger WHERE client_id = ? ORDER BY created_at DESC").all(cleanId) as any[];
    } catch (err) {
      console.error("❌ Failed to query invoice history:", err);
      return [];
    }
  }

  /**
   * Saves a new invoice record
   */
  public createInvoice(invoice: { id: string; clientId: string; amount: number; status: string; voiceMinutes: number; tokensUsed: number; dispatches: number; createdAt: string }) {
    try {
      const insert = this.db.prepare(`
        INSERT INTO invoice_ledger (invoice_id, client_id, amount, status, voice_minutes, tokens_used, dispatches, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(
        invoice.id,
        invoice.clientId.toLowerCase().trim(),
        invoice.amount,
        invoice.status,
        invoice.voiceMinutes,
        invoice.tokensUsed,
        invoice.dispatches,
        invoice.createdAt
      );
      console.log(`🧾 [Invoice DB] Saved invoice "${invoice.id}" for "${invoice.clientId}"`);
    } catch (err) {
      console.error("❌ Failed to insert invoice record:", err);
      throw err;
    }
  }

  /**
   * Seeds mock historical invoices for realistic billing demonstration
   */
  private seedDefaultInvoices() {
    try {
      const insertInvoice = this.db.prepare(`
        INSERT INTO invoice_ledger (invoice_id, client_id, amount, status, voice_minutes, tokens_used, dispatches, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date();
      const getPastDateString = (monthsAgo: number) => {
        const d = new Date();
        d.setMonth(now.getMonth() - monthsAgo);
        return d.toISOString().split('T')[0];
      };

      const mockInvoices = [
        { id: 'in_1sg8s', client: 'restoration_lv', amount: 374.50, status: 'paid', voice: 180, tokens: 250000, dispatches: 8, date: getPastDateString(1) },
        { id: 'in_9af92', client: 'restoration_lv', amount: 499.00, status: 'paid', voice: 240, tokens: 400000, dispatches: 12, date: getPastDateString(2) },
        { id: 'in_2kd9s', client: 'roofing_sc', amount: 245.20, status: 'paid', voice: 95, tokens: 180000, dispatches: 5, date: getPastDateString(1) },
        { id: 'in_8js73', client: 'roofing_sc', amount: 382.10, status: 'paid', voice: 150, tokens: 290000, dispatches: 9, date: getPastDateString(2) },
        { id: 'in_5nb73', client: 'property_apex', amount: 154.60, status: 'paid', voice: 60, tokens: 92000, dispatches: 2, date: getPastDateString(1) },
        { id: 'in_4kd82', client: 'realestate_nexus', amount: 489.15, status: 'paid', voice: 210, tokens: 620000, dispatches: 10, date: getPastDateString(1) },
        { id: 'in_3ld82', client: 'realestate_nexus', amount: 592.50, status: 'paid', voice: 280, tokens: 740000, dispatches: 12, date: getPastDateString(2) }
      ];

      for (const inv of mockInvoices) {
        insertInvoice.run(inv.id, inv.client, inv.amount, inv.status, inv.voice, inv.tokens, inv.dispatches, inv.date);
      }
      console.log(`🌱 [Invoice Seeding] Successfully seeded 7 default invoices.`);
    } catch (err: any) {
      console.error("❌ Failed to seed default invoices:", err.message);
    }
  }


  /**
   * Seeds default configurations for all 5 client tenants
   */
  private seedDefaultClientSettings() {
    const defaults: Record<string, any> = {
      restoration_lv: {
        name: "Restoration Pro Las Vegas",
        niche: "Emergency Water & Fire Mitigation",
        greeting: "Hello! Thank you for calling Restoration Pro Las Vegas. Can I get your full name, please?",
        chatGreeting: "Hello! Thank you for visiting Restoration Pro Las Vegas. Can I get your full name, please?",
        heroTitle: "Water or Fire Damage?<br><span class=\"text-glow\">Las Vegas Pro Team On Site.</span>",
        subtitle: "Fast, certified mitigation and structural restoration. We process direct insurance billing to safeguard your Las Vegas property.",
        logo: "Restoration Pro Las Vegas",
        phone: "📞 Urgent: Call (702) 555-0100",
        primaryColor: "hsl(14, 90%, 55%)",
        primaryHover: "hsl(14, 90%, 48%)",
        primaryGlow: "rgba(239, 68, 68, 0.15)",
        secondaryColor: "hsl(210, 90%, 60%)",
        secondaryHover: "hsl(210, 90%, 52%)",
        secondaryGlow: "rgba(59, 130, 246, 0.15)",
        bgPrimary: "#0a0808",
        bgSecondary: "#130f0f",
        password: "restoration123"
      },
      roofing_sc: {
        name: "Sin City Roof Crew",
        niche: "Storm Damage & Emergency Roof Leaks",
        greeting: "Hello! Thank you for calling Sin City Roof Crew. Can I get your full name, please?",
        chatGreeting: "Hello! Thank you for visiting Sin City Roof Crew. Can I get your full name, please?",
        heroTitle: "Emergency Roof Leak?<br><span class=\"text-glow\">Tarping & Repair Crews Ready.</span>",
        subtitle: "Fast, specialized storm damage responses, structural roof inspections, and leak mitigation. We protect your Sin City home.",
        logo: "Sin City Roof Crew",
        phone: "📞 Emergency Tarping: Call (702) 555-0200",
        primaryColor: "hsl(190, 95%, 50%)",
        primaryHover: "hsl(190, 95%, 43%)",
        primaryGlow: "rgba(6, 182, 212, 0.15)",
        secondaryColor: "hsl(280, 85%, 60%)",
        secondaryHover: "hsl(280, 85%, 52%)",
        secondaryGlow: "rgba(168, 85, 247, 0.15)",
        bgPrimary: "#050811",
        bgSecondary: "#0a1122",
        password: "roofing123"
      },
      property_apex: {
        name: "Apex Property Management",
        niche: "Tenant Emergency Repair Hotline",
        greeting: "Hello! Thank you for calling Apex Property Management emergencies line. Can I get your full name, please?",
        chatGreeting: "Hello! Welcome to the Apex Property Management maintenance support chat. Can I get your full name, please?",
        heroTitle: "Tenant Maintenance Emergency?<br><span class=\"text-glow\">Rapid Resolution & Repair.</span>",
        subtitle: "24/7 central repair line for Apex managed tenants. Submit your repair request below to dispatch a maintenance technician.",
        logo: "Apex Property Management",
        phone: "📞 Maintenance: Call (702) 555-0300",
        primaryColor: "hsl(150, 85%, 45%)",
        primaryHover: "hsl(150, 85%, 38%)",
        primaryGlow: "rgba(16, 185, 129, 0.15)",
        secondaryColor: "hsl(45, 95%, 55%)",
        secondaryHover: "hsl(45, 95%, 48%)",
        secondaryGlow: "rgba(234, 179, 8, 0.15)",
        bgPrimary: "#060a08",
        bgSecondary: "#0e1612",
        password: "property123"
      },
      realestate_nexus: {
        name: "Nexus Realty Group",
        niche: "Residential Property Sales & virtual tours",
        greeting: "Hello! Thank you for calling Nexus Realty Group. Can I get your full name, please?",
        chatGreeting: "Hello! Welcome to Nexus Realty Group. Can I get your full name, please?",
        heroTitle: "Find Your Dream Home.<br><span class=\"text-glow\">Nexus Realty Group Virtual Showings.</span>",
        subtitle: "Elite residential sales, leasing, and immersive virtual tours. Book your showing below and let us guide you home.",
        logo: "Nexus Realty Group",
        phone: "📞 Inquiries: Call (702) 555-0400",
        primaryColor: "hsl(270, 80%, 55%)",
        primaryHover: "hsl(270, 80%, 48%)",
        primaryGlow: "rgba(168, 85, 247, 0.15)",
        secondaryColor: "hsl(160, 85%, 45%)",
        secondaryHover: "hsl(160, 85%, 38%)",
        secondaryGlow: "rgba(16, 185, 129, 0.15)",
        bgPrimary: "#07050a",
        bgSecondary: "#100d16",
        password: "realestate123"
      },
      default_client: {
        name: "Syncro Scale",
        niche: "Smart Automation & AI Agent Integrations",
        greeting: "Hello! Thank you for contacting Syncro Scale, your partner in smart automation. How can I help you today?",
        chatGreeting: "Hello! Thank you for contacting Syncro Scale, your partner in smart automation. How can I help you today?",
        heroTitle: "",
        subtitle: "Redefining efficiency through scalable agents",
        logo: "Syncro Scale",
        phone: "",
        primaryColor: "#2CEE76",
        primaryHover: "#1DD962",
        primaryGlow: "rgba(44, 238, 118, 0.1)",
        secondaryColor: "#0D2240",
        secondaryHover: "#0a1a30",
        secondaryGlow: "rgba(13, 34, 64, 0.1)",
        bgPrimary: "#F9F6F0",
        bgSecondary: "#FAF8F5",
        password: "default123"
      }
    };

    for (const [clientId, settings] of Object.entries(defaults)) {
      this.saveClientSettings(clientId, settings);
    }
  }

  /**
   * Retrieves all templates for a client, merging custom templates with fallback default templates.
   */
  public getOutboundTemplates(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      if (isClient) {
        const cleanClient = clientId.toLowerCase().trim();
        const query = this.db.prepare(`
          SELECT * FROM outbound_templates WHERE client_id = ?
          UNION ALL
          SELECT * FROM outbound_templates WHERE client_id = 'default_client'
            AND id NOT IN (SELECT id FROM outbound_templates WHERE client_id = ?)
          ORDER BY id ASC
        `);
        return query.all(cleanClient, cleanClient) as any[];
      }
      return this.db.prepare("SELECT * FROM outbound_templates WHERE client_id = 'default_client' ORDER BY id ASC").all() as any[];
    } catch (err) {
      console.error("❌ Failed to query outbound templates:", err);
      return [];
    }
  }

  /**
   * Retrieves a single template by ID and client ID.
   */
  public getOutboundTemplate(templateId: string, clientId: string) {
    try {
      const cleanId = templateId.toLowerCase().trim();
      const cleanClient = clientId.toLowerCase().trim();
      
      // Attempt to retrieve custom template for client
      const template = this.db.prepare("SELECT * FROM outbound_templates WHERE id = ? AND client_id = ?").get(cleanId, cleanClient) as any;
      if (template) return template;
      
      // Fallback: Retrieve template for default_client
      return this.db.prepare("SELECT * FROM outbound_templates WHERE id = ? AND client_id = 'default_client'").get(cleanId) as any;
    } catch (err) {
      console.error("❌ Failed to query outbound template:", err);
      return null;
    }
  }

  /**
   * Saves or updates a template.
   */
  public saveOutboundTemplate(template: { id: string; clientId: string; name: string; subjectTemplate: string; bodyPrompt: string; isStatic: number }) {
    try {
      const cleanId = template.id.toLowerCase().trim();
      const cleanClient = template.clientId.toLowerCase().trim();
      const now = new Date().toISOString();
      
      const insert = this.db.prepare(`
        INSERT INTO outbound_templates (id, client_id, name, subject_template, body_prompt, is_static, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id, client_id) DO UPDATE SET
          name = excluded.name,
          subject_template = excluded.subject_template,
          body_prompt = excluded.body_prompt,
          is_static = excluded.is_static,
          updated_at = excluded.updated_at
      `);
      
      insert.run(cleanId, cleanClient, template.name, template.subjectTemplate, template.bodyPrompt, template.isStatic, now);
      console.log(`📢 [Templates DB] Saved template "${cleanId}" for "${cleanClient}"`);
    } catch (err) {
      console.error("❌ Failed to save template:", err);
      throw err;
    }
  }

  /**
   * Records a sent outreach email.
   */
  public createOutreachLog(log: { id: string; clientId: string; email: string; subject: string; body: string; status: string }) {
    try {
      const cleanClient = log.clientId.toLowerCase().trim();
      const cleanEmail = log.email.toLowerCase().trim();
      const now = new Date().toISOString();
      
      const insert = this.db.prepare(`
        INSERT INTO outreach_logs (id, client_id, email, subject, body, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      insert.run(log.id, cleanClient, cleanEmail, log.subject, log.body, log.status, now);
      console.log(`✉️ [Outreach Log DB] Logged sent email "${log.id}" to "${cleanEmail}"`);
    } catch (err) {
      console.error("❌ Failed to log outreach:", err);
      throw err;
    }
  }

  /**
   * Retrieves outreach logs.
   */
  public getOutreachLogs(clientId?: string) {
    try {
      const isClient = clientId && clientId !== 'all';
      if (isClient) {
        return this.db.prepare("SELECT * FROM outreach_logs WHERE client_id = ? ORDER BY created_at DESC").all(clientId.toLowerCase().trim()) as any[];
      }
      return this.db.prepare("SELECT * FROM outreach_logs ORDER BY created_at DESC").all() as any[];
    } catch (err) {
      console.error("❌ Failed to query outreach logs:", err);
      return [];
    }
  }

  /**
   * Seeds default campaign templates.
   */
  private seedDefaultTemplates() {
    try {
      const templates = [
        {
          id: 'mitigation',
          name: 'Emergency Mitigation Outreach',
          subjectTemplate: 'Quick question regarding {businessName}',
          bodyPrompt: `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for emergency mitigation and restoration contractors.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: when crews are out on a job, incoming water/fire emergency calls go to voicemail, losing $10k+ mitigation jobs to competitors.
- Mention how a 24/7 AI intake agent qualifies emergency leads instantly so they never miss a dispatch.
- End with a low-friction question asking if they are currently using automation to capture after-hours inbound calls.`,
          isStatic: 0
        },
        {
          id: 'roofing',
          name: 'Commercial Roofing Outreach',
          subjectTemplate: 'Roofing dispatch question - {businessName}',
          bodyPrompt: `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for commercial roofing contractors.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: during roof leaks or storm events, high-ticket roofing leads call in and want immediate response. If they hit voicemail, they call the next roofer.
- Mention how a 24/7 AI receptionist answers immediately, collects leak/building details, and books inspections on the spot.
- End with a low-friction question asking if they are currently using automation to capture after-hours inbound calls.`,
          isStatic: 0
        },
        {
          id: 'property',
          name: 'Property Management Outreach',
          subjectTemplate: 'Tenant maintenance intake for {businessName}',
          bodyPrompt: `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for property management and maintenance operations.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: handling tenant emergency maintenance requests after hours is a labor-intensive, expensive process prone to tenant complaints and dispatch delays.
- Mention how a 24/7 AI maintenance intake agent handles tenant calls, qualifies the severity of the issue, and books emergency dispatches instantly.
- End with a low-friction question asking if they are currently using automation to coordinate tenant emergency dispatches.`,
          isStatic: 0
        },
        {
          id: 'realestate',
          name: 'Real Estate Tour Outreach',
          subjectTemplate: 'Home showing question - {businessName}',
          bodyPrompt: `You are an expert B2B/B2C outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: residential buyers who hit voicemail when trying to schedule showing tours will immediately contact another listing agent.
- Mention how a 24/7 AI virtual tour booking assistant routes qualified showings instantly.
- End with a low-friction question asking if they are currently using automation to capture showing inquiries.`,
          isStatic: 0
        }
      ];

      const now = new Date().toISOString();
      const insert = this.db.prepare(`
        INSERT INTO outbound_templates (id, client_id, name, subject_template, body_prompt, is_static, updated_at)
        VALUES (?, 'default_client', ?, ?, ?, ?, ?)
      `);

      for (const t of templates) {
        insert.run(t.id, t.name, t.subjectTemplate, t.bodyPrompt, t.isStatic, now);
      }
      console.log("🌱 Seeded default campaign templates successfully.");
    } catch (err) {
      console.error("❌ Failed to seed default templates:", err);
    }
  }
}