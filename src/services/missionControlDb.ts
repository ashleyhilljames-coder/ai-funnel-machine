import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface MissionJob {
  id: string;
  homeowner_name: string;
  homeowner_phone: string;
  email: string;
  address: string;
  damage_type: string;
  water_source: string;
  affected_rooms: string;
  stage: 'NEW_INTAKE' | 'DISPATCHED' | 'ON_SITE' | 'DRYING' | 'SCOPING' | 'BILLED' | 'CLOSED';
  assigned_tech_name: string;
  assigned_tech_phone: string;
  locked_by_tech: string | null;
  referral_source: string;
  referral_type: 'PLUMBER' | 'AGENT' | 'PARTNER';
  referral_fee: number;
  payout_status: 'PENDING' | 'APPROVED' | 'PAID';
  call_transcript: string;
  signature_data: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MoistureReading {
  id: string;
  job_id: string;
  room_name: string;
  ambient_temp_f: number;
  relative_humidity_pct: number;
  wood_moisture_pct: number;
  drywall_moisture_pct: number;
  air_movers_count: number;
  dehumidifiers_count: number;
  tech_notes: string;
  timestamp: string;
}

export interface EquipmentLog {
  id: string;
  job_id: string;
  equipment_name: string;
  serial_no: string;
  room_name: string;
  status: 'ACTIVE' | 'REMOVED';
  placed_at: string;
  removed_at?: string | null;
}

export interface LossPhoto {
  id: string;
  job_id: string;
  photo_url: string;
  caption: string;
  category: 'INITIAL_DAMAGE' | 'EQUIPMENT_SETUP' | 'POST_DRYING';
  synced_cloud_url?: string;
  timestamp: string;
}

export interface ReferralPayout {
  id: string;
  job_id: string;
  partner_name: string;
  partner_type: string;
  referral_fee: number;
  payout_status: 'PENDING' | 'APPROVED' | 'PAID';
  paid_at?: string | null;
  transaction_ref?: string | null;
  created_at: string;
}

export class MissionControlDb {
  private db: Database.Database;

  constructor() {
    const dbPath = process.env.DB_PATH || (
      process.env.DATA_DIR
        ? path.join(process.env.DATA_DIR, 'syncro_scale.db')
        : path.join(process.cwd(), 'syncro_scale.db')
    );

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mc_jobs (
        id TEXT PRIMARY KEY,
        homeowner_name TEXT NOT NULL,
        homeowner_phone TEXT NOT NULL,
        email TEXT DEFAULT '',
        address TEXT NOT NULL,
        damage_type TEXT NOT NULL,
        water_source TEXT DEFAULT '',
        affected_rooms TEXT DEFAULT '',
        stage TEXT NOT NULL DEFAULT 'NEW_INTAKE',
        assigned_tech_name TEXT DEFAULT '',
        assigned_tech_phone TEXT DEFAULT '',
        locked_by_tech TEXT DEFAULT NULL,
        referral_source TEXT DEFAULT '',
        referral_type TEXT DEFAULT 'PLUMBER',
        referral_fee REAL DEFAULT 500.0,
        payout_status TEXT DEFAULT 'PENDING',
        call_transcript TEXT DEFAULT '',
        signature_data TEXT DEFAULT NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_mc_jobs_stage ON mc_jobs(stage);

      CREATE TABLE IF NOT EXISTS mc_moisture_readings (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        room_name TEXT NOT NULL,
        ambient_temp_f REAL NOT NULL,
        relative_humidity_pct REAL NOT NULL,
        wood_moisture_pct REAL NOT NULL,
        drywall_moisture_pct REAL NOT NULL,
        air_movers_count INTEGER DEFAULT 0,
        dehumidifiers_count INTEGER DEFAULT 0,
        tech_notes TEXT DEFAULT '',
        timestamp TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES mc_jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mc_moisture_job ON mc_moisture_readings(job_id);

      CREATE TABLE IF NOT EXISTS mc_equipment_logs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        serial_no TEXT DEFAULT '',
        room_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        placed_at TEXT NOT NULL,
        removed_at TEXT DEFAULT NULL,
        FOREIGN KEY (job_id) REFERENCES mc_jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mc_equip_job ON mc_equipment_logs(job_id);

      CREATE TABLE IF NOT EXISTS mc_loss_photos (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        caption TEXT DEFAULT '',
        category TEXT DEFAULT 'INITIAL_DAMAGE',
        synced_cloud_url TEXT DEFAULT '',
        timestamp TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES mc_jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mc_photos_job ON mc_loss_photos(job_id);

      CREATE TABLE IF NOT EXISTS mc_payouts (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        partner_name TEXT NOT NULL,
        partner_type TEXT NOT NULL,
        referral_fee REAL NOT NULL,
        payout_status TEXT DEFAULT 'PENDING',
        paid_at TEXT DEFAULT NULL,
        transaction_ref TEXT DEFAULT NULL,
        created_at TEXT NOT NULL
      );
    `);

    this.seedInitialDataIfEmpty();
  }

  public seedInitialJobs(): void {
    this.seedInitialDataIfEmpty();
  }

  public seedInitialDataIfEmpty() {
    const countObj = this.db.prepare('SELECT COUNT(*) as count FROM mc_jobs').get() as { count: number };
    if (countObj.count === 0) {
      console.log('🌱 Seeding Mission Control Emergency Restoration Mock Data...');
      const now = new Date();
      const subHours = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

      const insertJob = this.db.prepare(`
        INSERT INTO mc_jobs (
          id, homeowner_name, homeowner_phone, email, address, damage_type, water_source,
          affected_rooms, stage, assigned_tech_name, assigned_tech_phone, locked_by_tech,
          referral_source, referral_type, referral_fee, payout_status, call_transcript,
          signature_data, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 1. NEW_INTAKE
      insertJob.run(
        'JOB-2026-101',
        'Marcus & Sarah Vance',
        '+17025550192',
        'marcus.vance@gmail.com',
        '8910 N Durango Dr, Summerlin, NV',
        'Water Damage',
        'Kitchen Pipe Burst',
        'Kitchen, Dining Room, Hardwood Hallway',
        'NEW_INTAKE',
        '',
        '',
        null,
        'Apex Plumbing Pros',
        'PLUMBER',
        750.0,
        'PENDING',
        '[Deepgram Transcript 23:14:02]\n[Homeowner]: Emergency! Our kitchen supply line burst under the sink! Water is gushing onto the hardwood floor and seeping toward the hallway!\n[AI Operator]: We have logged your priority dispatch. An emergency mitigation team is standing by.',
        null,
        'Active pipe leak. Main shutoff valve closed by owner. Immediate extraction required.',
        subHours(0.5),
        subHours(0.5)
      );

      // 2. DISPATCHED
      insertJob.run(
        'JOB-2026-102',
        'David & Elena Rostova',
        '+17025550188',
        'elena.rostova@yahoo.com',
        '1205 E Tropicana Ave, Paradise, NV',
        'Storm & Roof Leak',
        'Roof Shingle Failure',
        'Master Bedroom, Upstairs Hallway',
        'DISPATCHED',
        'Evan Davis (EcoDry Response)',
        '+17025550111',
        'Evan Davis',
        'Vegas Property Managers Group',
        'AGENT',
        500.0,
        'PENDING',
        '[Deepgram Transcript 21:05:10]\n[Homeowner]: Water is dripping rapidly through the ceiling drywalls in our master bedroom after the storm. We need emergency tarping and drying.',
        null,
        'Dispatched Evan Davis. ETA window: 30 minutes.',
        subHours(1.5),
        subHours(1.0)
      );

      // 3. ON_SITE
      insertJob.run(
        'JOB-2026-103',
        'Robert Chen',
        '+17025550144',
        'robert.chen@outlook.com',
        '7310 S Rainbow Blvd, Spring Valley, NV',
        'Basement Flooding',
        'Sump Pump Overfill',
        'Finished Basement, Storage Room',
        'ON_SITE',
        'Evan Davis (EcoDry Response)',
        '+17025550111',
        'Evan Davis',
        'Desert Valley Plumbing',
        'PLUMBER',
        750.0,
        'PENDING',
        '[Deepgram Transcript 18:30:22]\n[Homeowner]: Sump pump failed during heavy rainfall. About 3 inches of standing water in basement storage.',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'Tech on site. Work authorization signed by homeowner. Starting subfloor water extraction.',
        subHours(3),
        subHours(2)
      );

      // 4. DRYING
      insertJob.run(
        'JOB-2026-104',
        'Sarah Jenkins',
        '+17025550177',
        'sarah.j@gmail.com',
        '4820 W Flamingo Rd, Las Vegas, NV',
        'Water Damage',
        'Water Heater Rupture',
        'Utility Closet, Garage, Hallway',
        'DRYING',
        'Alex Rivera (ProRestor LV)',
        '+17025550222',
        'Alex Rivera',
        'Las Vegas Home Inspectors',
        'AGENT',
        500.0,
        'APPROVED',
        '[Deepgram Transcript 14:12:00]\n[Homeowner]: 50-gallon water heater burst completely in garage utility closet.',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'Day 2 drying phase active. 4 Air Movers Pro 3000 and 2 LGR 7000 Dehumidifiers running.',
        subHours(26),
        subHours(4)
      );

      // 5. SCOPING
      insertJob.run(
        'JOB-2026-105',
        'Michael & Linda Taylor',
        '+17025550133',
        'm.taylor@hotmail.com',
        '456 Sunset Rd, Henderson, NV',
        'Fire & Smoke Mitigation',
        'Kitchen Stovetop Grease Fire',
        'Kitchen, Living Room Ceiling',
        'SCOPING',
        'Evan Davis (EcoDry Response)',
        '+17025550111',
        'Evan Davis',
        'Premier Insurance Referral Network',
        'PARTNER',
        600.0,
        'APPROVED',
        '[Deepgram Transcript Yesterday 09:15:30]\n[Homeowner]: Grease fire in kitchen. Fire put out by department, heavy smoke soot residue on cabinets and ceiling.',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'Thermal imaging complete. IICRC Insurance Scope Report generated for State Farm claim.',
        subHours(48),
        subHours(12)
      );

      // 6. BILLED
      insertJob.run(
        'JOB-2026-106',
        'Angela Martin',
        '+17025550303',
        'angela.martin@dundermifflin.com',
        '789 Apartment A, Las Vegas, NV',
        'Water Damage',
        'Second Floor Toilet Overflow',
        'Bathroom, Lower Floor Ceiling',
        'BILLED',
        'Alex Rivera (ProRestor LV)',
        '+17025550222',
        'Alex Rivera',
        'Apex Plumbing Pros',
        'PLUMBER',
        750.0,
        'PAID',
        '[Deepgram Transcript 3 days ago]\n[Homeowner]: Upper unit toilet overflowed, seeping through ceiling.',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'Drying complete. Standard structural clearance passed. Billed to Allstate Claim #AL-99201.',
        subHours(72),
        subHours(24)
      );

      // 7. CLOSED
      insertJob.run(
        'JOB-2026-107',
        'Kevin Malone',
        '+17025550399',
        'kevin.malone@gmail.com',
        '3320 W Sahara Ave, Las Vegas, NV',
        'Mold Mitigation',
        'HVAC Condensate Overflow',
        'HVAC Closet, Office Room',
        'CLOSED',
        'Evan Davis (EcoDry Response)',
        '+17025550111',
        'Evan Davis',
        'Desert Valley Plumbing',
        'PLUMBER',
        750.0,
        'PAID',
        '[Deepgram Transcript 5 days ago]\n[Homeowner]: HVAC drain line backup caused mold growth behind drywall.',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'Job fully remediated, signed off by adjuster, 1099 referral fee paid to Desert Valley Plumbing.',
        subHours(120),
        subHours(48)
      );

      // Seed Moisture Readings for Drying / Scoping jobs
      const insertMoisture = this.db.prepare(`
        INSERT INTO mc_moisture_readings (
          id, job_id, room_name, ambient_temp_f, relative_humidity_pct,
          wood_moisture_pct, drywall_moisture_pct, air_movers_count, dehumidifiers_count,
          tech_notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertMoisture.run('MR-101', 'JOB-2026-104', 'Utility Closet', 74.5, 68.2, 28.4, 42.0, 2, 1, 'Initial Day 1 reading. High moisture in lower drywall.', subHours(24));
      insertMoisture.run('MR-102', 'JOB-2026-104', 'Utility Closet', 78.0, 42.1, 14.2, 16.5, 2, 1, 'Day 2 reading. Significant drying progress. Target <15% RH achieved.', subHours(4));
      insertMoisture.run('MR-103', 'JOB-2026-104', 'Garage Hallway', 72.0, 55.0, 19.1, 24.8, 2, 1, 'Day 2 reading in hallway subfloor.', subHours(4));

      // Seed Equipment
      const insertEquip = this.db.prepare(`
        INSERT INTO mc_equipment_logs (id, job_id, equipment_name, serial_no, room_name, status, placed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertEquip.run('EQ-101', 'JOB-2026-104', 'DriEaz LGR 7000 Dehumidifier', 'DEHUM-7001', 'Utility Closet', 'ACTIVE', subHours(24));
      insertEquip.run('EQ-102', 'JOB-2026-104', 'ProDry Air Mover 3000', 'AM-301', 'Utility Closet', 'ACTIVE', subHours(24));
      insertEquip.run('EQ-103', 'JOB-2026-104', 'ProDry Air Mover 3000', 'AM-302', 'Garage Hallway', 'ACTIVE', subHours(24));
      insertEquip.run('EQ-104', 'JOB-2026-105', 'HEPA 500 Air Scrubber', 'SCRUB-501', 'Kitchen', 'ACTIVE', subHours(48));

      // Seed Loss Photos
      const insertPhoto = this.db.prepare(`
        INSERT INTO mc_loss_photos (id, job_id, photo_url, caption, category, synced_cloud_url, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertPhoto.run(
        'PH-101',
        'JOB-2026-104',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
        'Initial water damage under utility closet drywall',
        'INITIAL_DAMAGE',
        'https://r2.syncroscale.cloud/photos/PH-101.jpg',
        subHours(24)
      );

      insertPhoto.run(
        'PH-102',
        'JOB-2026-104',
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80',
        'DriEaz Dehumidifier and Air Movers containment setup',
        'EQUIPMENT_SETUP',
        'https://r2.syncroscale.cloud/photos/PH-102.jpg',
        subHours(23)
      );

      // Seed 1099 Payouts
      const insertPayout = this.db.prepare(`
        INSERT INTO mc_payouts (id, job_id, partner_name, partner_type, referral_fee, payout_status, paid_at, transaction_ref, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertPayout.run('PAY-101', 'JOB-2026-106', 'Apex Plumbing Pros', 'PLUMBER', 750.0, 'PAID', subHours(24), 'TXN-99120', subHours(72));
      insertPayout.run('PAY-102', 'JOB-2026-107', 'Desert Valley Plumbing', 'PLUMBER', 750.0, 'PAID', subHours(48), 'TXN-99121', subHours(120));
      insertPayout.run('PAY-103', 'JOB-2026-104', 'Las Vegas Home Inspectors', 'AGENT', 500.0, 'APPROVED', null, null, subHours(26));
      insertPayout.run('PAY-104', 'JOB-2026-105', 'Premier Insurance Referral Network', 'PARTNER', 600.0, 'APPROVED', null, null, subHours(48));
      insertPayout.run('PAY-105', 'JOB-2026-101', 'Apex Plumbing Pros', 'PLUMBER', 750.0, 'PENDING', null, null, subHours(0.5));
      insertPayout.run('PAY-106', 'JOB-2026-102', 'Vegas Property Managers Group', 'AGENT', 500.0, 'PENDING', null, null, subHours(1.5));

      console.log('✅ Mission Control Mock Data Seeding Complete!');
    }
  }

  // --- JOB METHODS ---
  public getJobs(): MissionJob[] {
    this.seedInitialJobs();
    const stmt = this.db.prepare('SELECT * FROM mc_jobs ORDER BY created_at DESC');
    return stmt.all() as MissionJob[];
  }

  public getJobById(id: string): MissionJob | null {
    const stmt = this.db.prepare('SELECT * FROM mc_jobs WHERE id = ?');
    const job = stmt.get(id) as MissionJob | undefined;
    return job || null;
  }

  public createJob(job: Partial<MissionJob>): MissionJob {
    const id = job.id || `JOB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mc_jobs (
        id, homeowner_name, homeowner_phone, email, address, damage_type, water_source,
        affected_rooms, stage, assigned_tech_name, assigned_tech_phone, locked_by_tech,
        referral_source, referral_type, referral_fee, payout_status, call_transcript,
        signature_data, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      job.homeowner_name || 'Emergency Intake',
      job.homeowner_phone || '+17025550199',
      job.email || '',
      job.address || 'Las Vegas, NV',
      job.damage_type || 'Water Damage',
      job.water_source || 'Pipe Leak',
      job.affected_rooms || 'Main Room',
      job.stage || 'NEW_INTAKE',
      job.assigned_tech_name || '',
      job.assigned_tech_phone || '',
      job.locked_by_tech || null,
      job.referral_source || 'Plumber Dispatch',
      job.referral_type || 'PLUMBER',
      job.referral_fee || 750.0,
      job.payout_status || 'PENDING',
      job.call_transcript || '',
      job.signature_data || null,
      job.notes || 'Emergency lead received.',
      now,
      now
    );

    // Automatically create corresponding pending 1099 payout
    if (job.referral_source) {
      this.createPayout({
        job_id: id,
        partner_name: job.referral_source,
        partner_type: job.referral_type || 'PLUMBER',
        referral_fee: job.referral_fee || 750.0,
        payout_status: 'PENDING',
        created_at: now
      });
    }

    return this.getJobById(id)!;
  }

  public updateJobStage(id: string, stage: MissionJob['stage'], techName?: string, techPhone?: string): { success: boolean; job?: MissionJob; error?: string } {
    const existing = this.getJobById(id);
    if (!existing) {
      return { success: false, error: 'Job not found' };
    }

    const now = new Date().toISOString();
    const cleanTechName = techName && techName.trim() ? techName.trim() : null;
    const lockedBy = cleanTechName || existing.locked_by_tech || null;
    const assignedTech = cleanTechName || existing.assigned_tech_name || '';
    const assignedPhone = techPhone || existing.assigned_tech_phone || '';

    let payoutStatus = existing.payout_status;
    if (['SCOPING', 'BILLED', 'CLOSED'].includes(stage) && payoutStatus === 'PENDING') {
      payoutStatus = 'APPROVED';
    }

    const stmt = this.db.prepare(`
      UPDATE mc_jobs
      SET stage = ?, assigned_tech_name = ?, assigned_tech_phone = ?, locked_by_tech = ?, payout_status = ?, updated_at = ?
      WHERE id = ? AND (locked_by_tech IS NULL OR locked_by_tech = ? OR ? IS NULL)
    `);

    const result = stmt.run(
      stage,
      assignedTech,
      assignedPhone,
      lockedBy,
      payoutStatus,
      now,
      id,
      cleanTechName,
      cleanTechName
    );

    if (result.changes === 0) {
      const currentJob = this.getJobById(id);
      return {
        success: false,
        error: `Race Lock: Job ${id} has already been accepted and locked by technician ${currentJob?.locked_by_tech || 'another technician'}.`
      };
    }

    if (['SCOPING', 'BILLED', 'CLOSED'].includes(stage) && existing.payout_status === 'PENDING') {
      this.db.prepare('UPDATE mc_payouts SET payout_status = ? WHERE job_id = ? AND payout_status = ?')
        .run('APPROVED', id, 'PENDING');
    }

    return { success: true, job: this.getJobById(id)! };
  }

  public updateSignature(id: string, signatureData: string): boolean {
    const now = new Date().toISOString();
    const stmt = this.db.prepare('UPDATE mc_jobs SET signature_data = ?, updated_at = ? WHERE id = ?');
    stmt.run(signatureData, now, id);
    return true;
  }

  // --- MOISTURE READINGS ---
  public getMoistureReadings(jobId: string): MoistureReading[] {
    const stmt = this.db.prepare('SELECT * FROM mc_moisture_readings WHERE job_id = ? ORDER BY timestamp DESC');
    return stmt.all(jobId) as MoistureReading[];
  }

  public addMoistureReading(reading: Partial<MoistureReading>): MoistureReading {
    const id = reading.id || `MR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = reading.timestamp || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mc_moisture_readings (
        id, job_id, room_name, ambient_temp_f, relative_humidity_pct,
        wood_moisture_pct, drywall_moisture_pct, air_movers_count, dehumidifiers_count,
        tech_notes, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      reading.job_id,
      reading.room_name || 'Main Room',
      reading.ambient_temp_f || 72.0,
      reading.relative_humidity_pct || 50.0,
      reading.wood_moisture_pct || 15.0,
      reading.drywall_moisture_pct || 18.0,
      reading.air_movers_count || 0,
      reading.dehumidifiers_count || 0,
      reading.tech_notes || '',
      timestamp
    );

    return this.db.prepare('SELECT * FROM mc_moisture_readings WHERE id = ?').get(id) as MoistureReading;
  }

  // --- EQUIPMENT LOGS ---
  public getEquipment(jobId: string): EquipmentLog[] {
    const stmt = this.db.prepare('SELECT * FROM mc_equipment_logs WHERE job_id = ? ORDER BY placed_at DESC');
    return stmt.all(jobId) as EquipmentLog[];
  }

  public addEquipment(equip: Partial<EquipmentLog>): EquipmentLog {
    const id = equip.id || `EQ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const placedAt = equip.placed_at || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mc_equipment_logs (id, job_id, equipment_name, serial_no, room_name, status, placed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      equip.job_id,
      equip.equipment_name || 'DriEaz Air Mover',
      equip.serial_no || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
      equip.room_name || 'Living Area',
      equip.status || 'ACTIVE',
      placedAt
    );

    return this.db.prepare('SELECT * FROM mc_equipment_logs WHERE id = ?').get(id) as EquipmentLog;
  }

  // --- LOSS PHOTOS ---
  public getPhotos(jobId: string): LossPhoto[] {
    const stmt = this.db.prepare('SELECT * FROM mc_loss_photos WHERE job_id = ? ORDER BY timestamp DESC');
    return stmt.all(jobId) as LossPhoto[];
  }

  public addPhoto(photo: Partial<LossPhoto>): LossPhoto {
    const id = photo.id || `PH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timestamp = photo.timestamp || new Date().toISOString();
    const cloudUrl = photo.synced_cloud_url || `https://r2.syncroscale.cloud/photos/${id}.jpg`;

    const stmt = this.db.prepare(`
      INSERT INTO mc_loss_photos (id, job_id, photo_url, caption, category, synced_cloud_url, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      photo.job_id,
      photo.photo_url || '',
      photo.caption || 'Loss Inspection Photo',
      photo.category || 'INITIAL_DAMAGE',
      cloudUrl,
      timestamp
    );

    return this.db.prepare('SELECT * FROM mc_loss_photos WHERE id = ?').get(id) as LossPhoto;
  }

  // --- PAYOUT LEDGER ---
  public getPayouts(): ReferralPayout[] {
    const stmt = this.db.prepare('SELECT * FROM mc_payouts ORDER BY created_at DESC');
    return stmt.all() as ReferralPayout[];
  }

  public createPayout(payout: Partial<ReferralPayout>): ReferralPayout {
    const id = payout.id || `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = payout.created_at || new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO mc_payouts (id, job_id, partner_name, partner_type, referral_fee, payout_status, paid_at, transaction_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      payout.job_id,
      payout.partner_name || 'Referral Partner',
      payout.partner_type || 'PLUMBER',
      payout.referral_fee || 750.0,
      payout.payout_status || 'PENDING',
      payout.paid_at || null,
      payout.transaction_ref || null,
      createdAt
    );

    return this.db.prepare('SELECT * FROM mc_payouts WHERE id = ?').get(id) as ReferralPayout;
  }

  public markPayoutPaid(id: string): { success: boolean; payout?: ReferralPayout; error?: string } {
    const stmtCheck = this.db.prepare('SELECT * FROM mc_payouts WHERE id = ?');
    const existing = stmtCheck.get(id) as ReferralPayout | undefined;
    if (!existing) {
      return { success: false, error: 'Payout record not found' };
    }

    const now = new Date().toISOString();
    const txnRef = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;

    const stmtUpdate = this.db.prepare(`
      UPDATE mc_payouts
      SET payout_status = 'PAID', paid_at = ?, transaction_ref = ?
      WHERE id = ?
    `);

    stmtUpdate.run(now, txnRef, id);

    // Also update associated job payout_status
    if (existing.job_id) {
      this.db.prepare("UPDATE mc_jobs SET payout_status = 'PAID' WHERE id = ?").run(existing.job_id);
    }

    const updated = stmtCheck.get(id) as ReferralPayout;
    return { success: true, payout: updated };
  }
}

export const missionDb = new MissionControlDb();
