import 'dotenv/config';
import { OutboundProcessor } from './src/outbound/processor';
import { LeadScraper } from './src/outbound/scrapers/leadScraper';
import * as path from 'path';

async function runMainOutboundPipeline() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  const csvPath = path.join(__dirname, 'leads_sample.csv');

  console.log("📂 [Agentic Nexus] Initializing bulk CSV outbound pipeline...");
  
  let successfulRows = 0;
  let failedRows = 0;
  const startTime = Date.now();

  try {
    const rawLeads = await scraper.parseCSVFile(csvPath);
    console.log(`📊 Parsed ${rawLeads.length} records from data source.\n`);

    for (let i = 0; i < rawLeads.length; i++) {
      console.log(`🌀 Processing row [${i + 1}/${rawLeads.length}]: ${rawLeads[i].businessName}`);
      const result = await outboundEngine.processRawOutboundLead(rawLeads[i]);

      if (result.status === 'contacted' && result.sequence) {
        successfulRows++;
        console.log(`✅ Success! Tracking ID: ${result.prospect.id}`);
        console.log(`📨 [Day 1 Email]: "${result.sequence.day1Email}"`);
        console.log(`📩 [Day 3 Bump ]: "${result.sequence.day3FollowUp}"`);
        console.log(`💬 [Day 5 LinkedIn]: "${result.sequence.day5LinkedIn}"\n`);
      } else {
        failedRows++;
        console.error(`❌ Row Warning: ${result.error}\n`);
      }
    }

    // 🕒 Calculate Performance metrics
    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    // Average manual writing time: roughly 15 minutes per 3-step sequence
    const estimatedHoursSaved = ((successfulRows * 15) / 60).toFixed(2);

    // 📊 PRINT BEAUTIFUL EXECUTION DASHBOARD SUMMARY 📊
    console.log("=========================================================================");
    console.log(" ⚡ AGENTIC NEXUS — BULK OUTBOUND PIPELINE EXECUTION REPORT ⚡ ");
    console.log("=========================================================================");
    console.log(` 🏁 Status:           COMPLETED SUCCESSFULLY`);
    console.log(` 📅 Timestamp:        ${new Date().toLocaleString()}`);
    console.log(` ⏱️  Execution Time:   ${totalTimeSeconds} seconds`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 📈 Total Ingested:   ${rawLeads.length} prospects`);
    console.log(` ✅ Successfully Run: ${successfulRows} campaigns written to results CSV`);
    console.log(` ❌ Skipped/Failed:   ${failedRows} records`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 🧠 Automation Value: ~${estimatedHoursSaved} hours of copywriting labor saved`);
    console.log("=========================================================================\n");

  } catch (error: any) {
    console.error(`💥 Critical failure executing job: ${error.message}`);
  }
}

runMainOutboundPipeline();