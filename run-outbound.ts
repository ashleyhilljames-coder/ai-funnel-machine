import 'dotenv/config';
import { OutboundProcessor } from './src/outbound/processor';
import { LeadScraper } from './src/outbound/scrapers/leadScraper';
import { IntakeRouter } from './src/outbound/intakeRouter';
import { LeadGuard } from './src/outbound/leadGuard';
import * as path from 'path';

// Helper for API rate-limit throttling
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMainOutboundPipeline() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  const router = new IntakeRouter();
  const guard = new LeadGuard();

  const clientArg = process.argv.find((arg) => arg.startsWith('--client='));
  const clientId = clientArg ? clientArg.split('=')[1] : 'default_client';

  const pendingFiles = router.getPendingCSVFiles();

  if (pendingFiles.length === 0) {
    console.log("=====================================================================");
    console.log(`[Syncro Scale] Tenant Workspace: [${clientId.toUpperCase()}] - No pending CSV files found.`);
    console.log("👉 Tip: Drop lead sheets into the 'intake/' directory to begin.");
    console.log("=====================================================================");
    return;
  }

  console.log(`📂 [Syncro Scale] Engine Activated | Tenant: [${clientId.toUpperCase()}]`);
  console.log(`📂 Queued Files: ${pendingFiles.length}`);

  let totalSuccessfulRows = 0;
  let totalFailedRows = 0;
  let totalSkippedDuplicates = 0;
  let totalEmailsDispatched = 0;
  const startTime = Date.now();

  for (const filePath of pendingFiles) {
    const currentFileName = path.basename(filePath);
    console.log(`\n🚀 Processing File: [${currentFileName}]`);
    console.log("-------------------------------------------------------------------------");

    try {
      const rawLeads = await scraper.parseCSVFile(filePath);
      console.log(`📊 Parsed ${rawLeads.length} records.`);

      for (let i = 0; i < rawLeads.length; i++) {
        const currentLead = rawLeads[i];

        // 1. Persistent Deduplication Check
        if (currentLead.email && guard.isDuplicateForClient(currentLead.email, clientId)) {
          totalSkippedDuplicates++;
          console.log(`⚠️ [SYNCRO GUARD] Duplicate flagged for [${clientId.toUpperCase()}]: ${currentLead.email}. Skipping.`);
          continue;
        }

        console.log(`🌀 Processing [${i + 1}/${rawLeads.length}]: ${currentLead.businessName || currentLead.email}`);

        // 2. Safe Execution with API Rate Throttling
        try {
          const result = await outboundEngine.processRawOutboundLead(clientId, currentLead);

          if (result.status === 'contacted' && result.sequence) {
            totalSuccessfulRows++;
            totalEmailsDispatched++;
            
            // Immediately register state to disk/db so crashes don't cause duplicate sends
            guard.registerClientLead(currentLead.email, clientId, false, currentLead.businessName, currentLead.niche);

            console.log(`✅ Success! Tracking ID: ${result.prospect?.id || 'N/A'}`);
            console.log(`⚡ [RESEND] Dispatched to ${currentLead.email}`);
          } else {
            totalFailedRows++;
            console.error(`❌ Dispatch Failed: ${result.error || 'Unknown status response'}`);
          }
        } catch (leadError: any) {
          totalFailedRows++;
          console.error(`❌ Lead Processing Exception (${currentLead.email}): ${leadError.message}`);
        }

        // 3. Mandatory 250ms throttle delay between API calls to protect OpenAI / Resend quotas
        await sleep(250);
      }

      // Archive file only after processing completes safely
      router.archiveProcessedFile(filePath);

    } catch (fileError: any) {
      console.error(`💥 Failed processing file [${currentFileName}]: ${fileError.message}`);
    }
  }

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
  const idledHoursSaved = ((totalSuccessfulRows * 15) / 60).toFixed(2);

  // 📊 SYNCRO SCALE CONTROL REPORT
  console.log("=========================================================================");
  console.log(` ⚡ SYNCRO SCALE — LIVE NETWORK DISPATCH CONTROL REPORT ⚡ `);
  console.log("=========================================================================");
  console.log(` 🏢 Client Profile:   ${clientId.toUpperCase()}`);
  console.log(` 🏁 Status:           COMPLETED`);
  console.log(` ⏱️  Execution Time:   ${totalTimeSeconds}s`);
  console.log("-------------------------------------------------------------------------");
  console.log(` 📈 Source Files:     ${pendingFiles.length}`);
  console.log(` ✅ Campaigns Built:  ${totalSuccessfulRows}`);
  console.log(` 📧 Live Dispatches:  ${totalEmailsDispatched} via Resend`);
  console.log(` ⚠️  Duplicates Blocked: ${totalSkippedDuplicates}`);
  console.log(` ❌ Failed Records:   ${totalFailedRows}`);
  console.log("-------------------------------------------------------------------------");
  console.log(` 🧠 Value Generated: ~${idledHoursSaved} hours saved`);
  console.log("=========================================================================\n");
}

runMainOutboundPipeline();