import 'dotenv/config';
import { OutboundProcessor } from './src/outbound/processor';
import { LeadScraper } from './src/outbound/scrapers/leadScraper';
import * as path from 'path';

async function runMainOutboundPipeline() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper();
  
  // Point directly to your live spreadsheet source
  const csvPath = path.join(__dirname, 'leads_sample.csv');

  console.log("📂 [Agentic Nexus] Initializing bulk CSV outbound pipeline...");
  
  try {
    const rawLeads = await scraper.parseCSVFile(csvPath);
    console.log(`📊 Parsed ${rawLeads.length} records from data source.\n`);

    for (let i = 0; i < rawLeads.length; i++) {
      console.log(`🌀 Processing row [${i + 1}/${rawLeads.length}]: ${rawLeads[i].businessName}`);
      const result = await outboundEngine.processRawOutboundLead(rawLeads[i]);

     if (result.status === 'contacted' && result.sequence) {
        console.log(`✅ Success! Tracking ID: ${result.prospect.id}`);
        console.log(`📨 [Day 1 Email]: "${result.sequence.day1Email}"`);
        console.log(`📩 [Day 3 Bump ]: "${result.sequence.day3FollowUp}"`);
        console.log(`💬 [Day 5 LinkedIn]: "${result.sequence.day5LinkedIn}"\n`);
      }
    }
    console.log("🏁 Bulk outbound pipeline job completed successfully!");
  } catch (error: any) {
    console.error(`💥 Critical failure executing job: ${error.message}`);
  }
}

runMainOutboundPipeline();
