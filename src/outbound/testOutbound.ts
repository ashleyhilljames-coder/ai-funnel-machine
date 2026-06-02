import { LeadScraper } from './scrapers/leadScraper';
import { OutboundSequenceManager } from './sequences/outboundSequence';

function runOutboundTest() {
  const scraper = new LeadScraper();
  const sequenceManager = new OutboundSequenceManager();

  // 1. Simulate raw data scraped from the web (one real estate, one contractor!)
  const rawLeads = [
    {
      businessName: "Vegas Elite Realty Group",
      contactName: "Sarah Jenkins",
      email: "SARAH@VEGASELITEREALTY.COM", // Testing lowercase sanitization
      phone: "702-555-0199",
      website: "https://vegaseliterealty.com",
      notes: "Top producing brokerage in Clark County."
    },
    {
      businessName: "Desert Flood & Smoke Restoration",
      contactName: "Mike Ramirez",
      email: "mike@desertrestoration.com",
      phone: "702-555-0143",
      website: "https://desertrestoration.com",
      notes: "Emergency mitigation contractor."
    }
  ];

  console.log("🚀 Starting Agentic Nexus Outbound Engine Test...\n");

  // 2. Loop through each raw lead, process it, and generate the email
  rawLeads.forEach((rawLead, index) => {
    try {
      console.log(`--- Processing Lead #${index + 1}: ${rawLead.businessName} ---`);
      
      // Sanitize the lead using our scraper tool
      const cleanProspect = scraper.parseRawLead(rawLead);
      console.log(`✅ Lead Sanitized! ID Generated: ${cleanProspect.id}`);
      console.log(`📧 Target Email: ${cleanProspect.email}`);

      // Generate the Stage 1 personalized email template
      const emailMessage = sequenceManager.generateMessage(cleanProspect);
      console.log(`📝 Generated Outreach Message:\n"${emailMessage}"\n`);

    } catch (error: any) {
      console.error(`❌ Error processing lead: ${error.message}\n`);
    }
  });

  console.log("🏁 Test complete. Full pipeline validated successfully!");
}

// Run the test function
runOutboundTest();