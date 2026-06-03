import 'dotenv/config';
import { OutboundProcessor } from './src/outbound/processor';
import { LeadScraper } from './src/outbound/scrapers/leadScraper';
import { IntakeRouter } from './src/outbound/intakeRouter';
import { LeadGuard } from './src/outbound/leadGuard';
import { WebhookPublisher, WebhookPayload } from './src/outbound/webhookPublisher'; // Ensure this is present
import * as path from 'path';

async function runMainOutboundPipeline() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  const router = new IntakeRouter();
  const guard = new LeadGuard();
  const publisher = new WebhookPublisher(); // Ensure this is present

  const clientArg = process.argv.find(arg => arg.startsWith('--client='));
  const clientId = clientArg ? clientArg.split('=')[1] : 'default_client';

  const pendingFiles = router.getPendingCSVFiles();

  if (pendingFiles.length === 0) {
    console.log("=========================================================================");
    console.log(`📭 [Agentic Nexus] Tenant Workspace: [${clientId.toUpperCase()}]`);
    console.log("📭 Intake Router Status: No pending CSV files found.");
    console.log("👉 Drop your lead sheets directly into the 'intake/' directory to run.");
    console.log("=========================================================================\n");
    return;
  }

  console.log(`📂 [Agentic Nexus] Multi-Tenant Router Activated | Profile: [${clientId.toUpperCase()}]`);
  console.log(`📂 Found ${pendingFiles.length} file(s) waiting in queue.`);
  
  let totalSuccessfulRows = 0;
  let totalFailedRows = 0;
  let totalSkippedDuplicates = 0;
  let totalWebhooksPublished = 0; // The tracking variable
  const startTime = Date.now();

  try {
    for (const filePath of pendingFiles) {
      const currentFileName = path.basename(filePath);
      console.log(`\n🚀 Starting Processing Queue for file: [${currentFileName}]`);
      console.log("-------------------------------------------------------------------------");

      const rawLeads = await scraper.parseCSVFile(filePath);
      console.log(`📊 Parsed ${rawLeads.length} records from data source.`);

      for (let i = 0; i < rawLeads.length; i++) {
        const currentLead = rawLeads[i];
        
        if (currentLead.email && guard.isDuplicateForClient(currentLead.email, clientId)) {
          totalSkippedDuplicates++;
          console.log(`⚠️  [TENANT GUARD] Duplicate flagged for Client [${clientId.toUpperCase()}]! Email: ${currentLead.email}. Skipping...`);
          continue; 
        }

        console.log(`🌀 Processing row [${i + 1}/${rawLeads.length}]: ${currentLead.businessName}`);
        const result = await outboundEngine.processRawOutboundLead(currentLead);

        if (result.status === 'contacted' && result.sequence) {
          totalSuccessfulRows++;
          guard.registerClientLead(currentLead.email, clientId, false);
          
          console.log(`✅ Success! Tracking ID: ${result.prospect.id}`);
          
          // Construct the data map payload
          const dispatchPayload: WebhookPayload = {
            clientId,
            trackingId: result.prospect.id,
            timestamp: new Date().toISOString(),
            lead: {
              businessName: currentLead.businessName,
              contactName: currentLead.contactName,
              email: currentLead.email,
              niche: currentLead.niche
            },
            sequence: {
              day1Email: result.sequence.day1Email,
              day3FollowUp: result.sequence.day3FollowUp,
              day5LinkedIn: result.sequence.day5LinkedIn
            }
          };

          console.log(`📡 Sending secure payload to automated webhook receiver...`);
          const publishResult = await publisher.publishSequence(dispatchPayload);
          
          if (publishResult.success) {
            totalWebhooksPublished++;
            console.log(`⚡ [WEBHOOK] Transmission verified successfully by endpoint!`);
          } else {
            console.log(`⚠️  [WEBHOOK NETWORK ERROR] ${publishResult.error}`);
          }
          console.log(""); 
        } else {
          totalFailedRows++;
          console.error(`❌ Row Warning: ${result.error}\n`);
        }
      }

      router.archiveProcessedFile(filePath);
    }

    const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const idledHoursSaved = ((totalSuccessfulRows * 15) / 60).toFixed(2);

    // 📊 EXPANDED NETWORKING CONTROL REPORT DASHBOARD
    console.log("=========================================================================");
    console.log(` ⚡ AGENTIC NEXUS — LIVE NETWORK DISPATCH CONTROL REPORT ⚡ `);
    console.log("=========================================================================");
    console.log(` 🏢 Client Profile:   ${clientId.toUpperCase()}`);
    console.log(` 🏁 Status:           COMPLETED RUN OVER ALL QUEUES`);
    console.log(` 📅 Timestamp:        ${new Date().toLocaleString()}`);
    console.log(` ⏱️  Execution Time:   ${totalTimeSeconds} seconds`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 📈 Total Files Run:  ${pendingFiles.length} source file(s)`);
    console.log(` ✅ Campaigns Written: ${totalSuccessfulRows} total scripts generated`);
    console.log(` 📡 Live Dispatches:  ${totalWebhooksPublished} payloads successfully hit webhook`); // This row!
    console.log(` ⚠️  Client Protected: ${totalSkippedDuplicates} duplicate record(s) isolated`);
    console.log(` ❌ Skipped/Failed:   ${totalFailedRows} records total`);
    console.log("-------------------------------------------------------------------------");
    console.log(` 🧠 Automation Value: ~${idledHoursSaved} hours of copywriting labor saved`);
    console.log("=========================================================================\n");

  } catch (error: any) {
    console.error(`💥 Critical failure executing job: ${error.message}`);
  }
}

runMainOutboundPipeline();