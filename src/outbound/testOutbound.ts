import { OutboundProcessor } from './processor';
import { LeadScraper } from './scrapers/leadScraper';
import * as path from 'path';

async function runLiveCSVTest() {
  const outboundEngine = new OutboundProcessor();
  const scraper = new LeadScraper(); // Needed to read the CSV file directly

  // Define the path to your new sample CSV file
  const csvPath = path.join(__dirname, '../../leads_sample.csv');

  console.log("📂 Ingesting Live Data Source from CSV...");

  try {
    // Step 1: Read and parse the raw spreadsheet rows
    const rawLeads = await scraper.parseCSVFile(csvPath);
    console.log(`📊 Successfully parsed ${rawLeads.length} rows from CSV file.\n`);

    // Step 2: Loop through the parsed data and feed it into the processor
    for (let i = 0; i < rawLeads.length; i++) {
      console.log(`🌀 Ingesting Lead [${i + 1}/${rawLeads.length}]: ${rawLeads[i].businessName}`);
      
      const result = await outboundEngine.processRawOutboundLead(rawLeads[i]);

      if (result.status === 'contacted') {
        console.log(`✅ Pipeline Success! Tracking ID: ${result.prospect.id}`);
        console.log(`📧 Cleaned Email: ${result.prospect.email}`);
        console.log(`📨 outreach Message:\n"${result.generatedMessage}"\n`);
      } else {
        console.error(`❌ Pipeline Warning: ${result.error}\n`);
      }
    }

    console.log("🏁 Live CSV data stream simulation complete!");

  } catch (error: any) {
    console.error(`💥 Critical Engine Error: ${error.message}`);
  }
}

runLiveCSVTest();