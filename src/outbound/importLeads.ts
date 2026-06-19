import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import { IntakeRouter } from './intakeRouter.js';
import { LeadGuard } from './leadGuard.js';
import { appendLeadToSheet } from '../services/sheetsService.js';

export async function runLeadImportPipeline() {
  const router = new IntakeRouter();
  const guard = new LeadGuard();
  const pendingFiles = router.getPendingCSVFiles();
  const clientId = 'default_client';

  if (pendingFiles.length === 0) {
    console.log("=====================================================================");
    console.log(`[Lead Importer] Profile: [${clientId.toUpperCase()}] - No pending CSV files found.`);
    console.log("👉 Tip: Drop your lead sheets directly into the 'intake/' directory to begin.");
    console.log("=====================================================================");
    return;
  }

  console.log(`📂 [Lead Importer] Ingestion Router Active | Profile: [${clientId.toUpperCase()}]`);
  console.log(`📂 Found ${pendingFiles.length} file(s) waiting in the queue.\n`);

  let totalParsed = 0;
  let totalImported = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  try {
    for (const filePath of pendingFiles) {
      const currentFileName = path.basename(filePath);
      console.log(`🚀 Processing Lead List: [${currentFileName}]`);
      console.log("-------------------------------------------------------------------------");

      // Read and parse the CSV file
      const rawRecords: any[] = await new Promise((resolve, reject) => {
        const records: any[] = [];
        fs.createReadStream(filePath)
          .pipe(parse({ 
            columns: true, 
            skip_empty_lines: true,
            trim: true
          }))
          .on('data', (row) => records.push(row))
          .on('end', () => resolve(records))
          .on('error', (err) => reject(err));
      });

      console.log(`📊 Parsed ${rawRecords.length} rows from CSV file.`);

      for (let i = 0; i < rawRecords.length; i++) {
        const row = rawRecords[i];
        totalParsed++;

        // Map columns dynamically to support various CSV schemas
        const name = (row.Name || row.name || row.Contact || row.contactName || row.ContactName || 'Unknown Contact').trim();
        const phone = (row.Phone || row.phone || row.PhoneNumber || row.phone_number || '').trim();
        const email = (row.Email || row.email || row.EmailAddress || row.email_address || '').trim().toLowerCase();
        const address = (row.Address || row.address || row.Property || row.property || row.PropertyAddress || 'No Address Provided').trim();
        const damageType = (row.DamageType || row.damageType || row.Damage || row.damage || 'Water Damage').trim();

        // Lead Guard: Check for missing email (required for duplication check)
        if (!email) {
          totalFailed++;
          console.warn(`⚠️  Row [${i + 1}]: Skipped - Missing mandatory Email address.`);
          continue;
        }

        // Lead Guard: Deduplicate against SQLite database
        if (guard.isDuplicateForClient(email, clientId)) {
          totalDuplicates++;
          console.log(`⚠️  [DUPLICATE] Skipped - Email ${email} already processed.`);
          continue;
        }

        try {
          // Write to Google Sheet
          console.log(`🌀 Ingesting row [${i + 1}/${rawRecords.length}]: ${name} (${email})`);
          await appendLeadToSheet(clientId, { name, phone, email, address, damageType }, 'Imported Lists');
          
          // Register inside SQLite DB partition to prevent future duplication
          guard.registerClientLead(email, clientId, false, name, damageType);
          totalImported++;
        } catch (sheetError: any) {
          totalFailed++;
          console.error(`❌ Ingestion failed for row [${i + 1}]:`, sheetError.message);
        }
      }

      // Move file to archive directory
      router.archiveProcessedFile(filePath);
    }

    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    // Ingestion Inbound Control Report Dashboard
    console.log("\n=========================================================================");
    console.log(` ⚡ SYNCRO SCALE — DETERMINISTIC LEAD INGESTION REPORT ⚡ `);
    console.log("=========================================================================");
    console.log(` 🏢 Client Profile:   ${clientId.toUpperCase()}`);
    console.log(` 🏁 Status:           COMPLETED`);
    console.log(` 📅 Timestamp:        ${new Date().toLocaleString()}`);
    console.log(` ⏱️  Execution Time:   ${totalTimeSeconds} seconds`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 📈 Total Leads Run:  ${totalParsed} records`);
    console.log(` ✅ Sheets Imported:  ${totalImported} leads successfully appended`);
    console.log(` ⚠️  Duplicates Blocked: ${totalDuplicates} duplicates isolated`);
    console.log(` ❌ Ingestion Failures: ${totalFailed} records failed`);
    console.log("=========================================================================\n");
    return {
      success: true,
      totalParsed,
      totalImported,
      totalDuplicates,
      totalFailed,
      executionTime: totalTimeSeconds
    };
  } catch (error: any) {
    console.error(`💥 Critical failure during lead list import: ${error.message}`);
    return {
      success: false,
      error: error.message,
      totalParsed: 0,
      totalImported: 0,
      totalDuplicates: 0,
      totalFailed: 0,
      executionTime: "0"
    };
  }
}

if (process.argv[1] && (process.argv[1].endsWith('importLeads.ts') || process.argv[1].endsWith('importLeads.js') || process.argv[1].includes('import-leads'))) {
  runLeadImportPipeline().catch(console.error);
}
