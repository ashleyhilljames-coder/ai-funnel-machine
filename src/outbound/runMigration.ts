import Database from 'better-sqlite3';
import * as path from 'path';

function runMigration() {
  const dbPath = path.join(__dirname, '../../syncro_scale.db');
  console.log(`🚀 Running database migration on: ${dbPath}`);
  
  const db = new Database(dbPath);

  try {
    // Drop existing tables to start fresh with new schemas
    console.log("Dropping existing tables customer_profiles and voice_telemetry_logs if they exist...");
    db.exec(`DROP TABLE IF EXISTS customer_profiles;`);
    db.exec(`DROP TABLE IF EXISTS voice_telemetry_logs;`);

    // Create customer_profiles table
    console.log("Creating table: customer_profiles");
    db.exec(`
      CREATE TABLE customer_profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        phone TEXT,
        extracted_traits TEXT DEFAULT '{}',
        observations TEXT DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create voice_telemetry_logs table
    console.log("Creating table: voice_telemetry_logs");
    db.exec(`
      CREATE TABLE voice_telemetry_logs (
        id TEXT PRIMARY KEY,
        call_sid TEXT UNIQUE NOT NULL,
        stt_latency_ms INTEGER DEFAULT 0,
        llm_processing_ms INTEGER DEFAULT 0,
        tts_latency_ms INTEGER DEFAULT 0,
        time_to_first_audio_ms INTEGER DEFAULT 0,
        interrupted INTEGER DEFAULT 0
      );
    `);

    console.log("✅ Database schema migrated successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigration();
