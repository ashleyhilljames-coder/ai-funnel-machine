import 'dotenv/config';
import app from './server.js';
import { startSubscriber } from './subscriber.js';
import { processLead } from './processor.js';

// Import our brand-new outbound processing components
import { OutboundProcessor } from './outbound/processor.js';
import { LeadScraper } from './outbound/scrapers/leadScraper.js';
import * as path from 'path';

/**
 * Handles bulk outbound processing from a CSV file source
 */
async function runOutboundBatch() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  
  // Clean, standard path mapping that matches your working test script!
  const csvPath = path.join(__dirname, '../leads_sample.csv');

  console.log("📂 [Outbound] Initializing bulk CSV processing job...");
  try {
    const rawLeads = await scraper.parseCSVFile(csvPath);
    console.log(`📊 [Outbound] Parsed ${rawLeads.length} records from data source.\n`);

    for (let i = 0; i < rawLeads.length; i++) {
      console.log(`🌀 [Outbound] Processing row [${i + 1}/${rawLeads.length}]: ${rawLeads[i].businessName}`);
      const result = await outboundEngine.processRawOutboundLead(rawLeads[i]);

      if (result.status === 'contacted') {
        console.log(`✅ [Outbound] Success! Tracking ID: ${result.prospect.id}`);
        console.log(`📨 [Outbound] Live outreach generated:\n"${result.generatedMessage}"\n`);
      } else {
        console.error(`❌ [Outbound] Row Warning: ${result.error}\n`);
      }
    }
    console.log("🏁 [Outbound] Bulk processing job completed successfully.");
  } catch (error: any) {
    console.error(`💥 [Outbound] Critical failure executing job: ${error.message}`);
  }
}

/**
 * Main application boot loader
 */
async function main() {
  // Check if the terminal command includes the "--outbound" flag
  if (process.argv.includes('--outbound')) {
    await runOutboundBatch();
    process.exit(0); // Exit cleanly when the automated batch job finishes
  }

  // Otherwise, default to booting up the continuous live system server!
  const PORT = process.env.PORT ?? 3000;

  app.listen(PORT, () => {
    console.log(`🚀 AI Funnel Machine listening on port ${PORT}`);
  });

  const closeSubscriber = startSubscriber(async (lead) => {
    const result = await processLead(lead);
    console.log(`[Processor] outcome=${result.outcome}`);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await closeSubscriber();
    process.exit(0);
  });
}

main();