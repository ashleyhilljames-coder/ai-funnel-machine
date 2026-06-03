import 'dotenv/config';
import { OutboundProcessor } from './src/outbound/processor';
import { LeadScraper } from './src/outbound/scrapers/leadScraper';
import { IntakeRouter } from './src/outbound/intakeRouter';
import * as path from 'path';
import * as fs from 'fs';

async function runMainOutboundPipeline() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  const router = new IntakeRouter();

  // 1. Scan for pending files inside the intake/ folder
  const pendingFiles = router.getPendingCSVFiles();

  if (pendingFiles.length === 0) {
    console.log("=========================================================================");
    console.log("📭 [Agentic Nexus] Intake Router Status: No pending CSV files found.");
    console.log("👉 Drop your lead sheets directly into the 'intake/' directory to run.");
    console.log("=========================================================================\n");
    return;
  }

  console.log(`📂 [Agentic Nexus] Intake Router activated. Found ${pendingFiles.length} file(s) waiting.`);
  
  let totalSuccessfulRows = 0;
  let totalFailedRows = 0;
  const startTime = Date.now();

  try {
    // 2. Loop through every pending file sequentially
    for (const filePath of pendingFiles) {
      const currentFileName = path.basename(filePath);
      console.log(`\n🚀 Starting Processing Queue for file: [${currentFileName}]`);
      console.log("-------------------------------------------------------------------------");

      const rawLeads = await scraper.parseCSVFile(filePath);
      console.log(`📊 Parsed ${rawLeads.length} records from data source.`);

      for (let i = 0; i < rawLeads.length; i++) {
        console.log(`🌀 Processing row [${i + 1}/${rawLeads.length}]: ${rawLeads[i].businessName}`);
        const result = await outboundEngine.processRawOutboundLead(rawLeads[i]);

        if (result.status === 'contacted' && result.sequence) {
          totalSuccessfulRows++;
          console.log(`✅ Success! Tracking ID: ${result.prospect.id}`);
          console.log(`📨 [Day 1 Email]: "${result.sequence.day1Email}"`);
          console.log(`📩 [Day 3 Bump ]: "${result.sequence.day3FollowUp}"`);
          console.log(`💬 [Day 5 LinkedIn]: "${result.sequence.day5LinkedIn}"\n`);
        } else {
          totalFailedRows++;
          console.error(`❌ Row Warning: ${result.error}\n`);
        }
      }

      // 3. Post-processing archive step for this file
      router.archiveProcessedFile(filePath);
    }

    // 🕒 Calculate Performance metrics
    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const estimatedHoursSaved = ((totalSuccessfulRows * 15) / 60).toFixed(2);

    // 📊 PRINT BEAUTIFUL EXECUTION DASHBOARD SUMMARY 📊
    console.log("=========================================================================");
    console.log(" ⚡ AGENTIC NEXUS — ENHANCED MULTI-FILE PIPELINE EXECUTION REPORT ⚡ ");
    console.log("=========================================================================");
    console.log(` 🏁 Status:           COMPLETED RUN OVER ALL QUEUES`);
    console.log(` 📅 Timestamp:        ${new Date().toLocaleString()}`);
    console.log(` ⏱️  Execution Time:   ${totalTimeSeconds} seconds`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 📈 Total Files Run:  ${pendingFiles.length} source file(s)`);
    console.log(` ✅ Successfully Run: ${totalSuccessfulRows} total campaigns written to results CSV`);
    console.log(` ❌ Skipped/Failed:   ${totalFailedRows} records total`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 🧠 Automation Value: ~${estimatedHoursSaved} hours of copywriting labor saved`);
    console.log("=========================================================================\n");

  } catch (error: any) {
    console.error(`💥 Critical failure executing job: ${error.message}`);
  }
}

runMainOutboundPipeline();