import { OutboundProcessor } from './processor';

async function runIntegratedOutboundTest() {
  const outboundEngine = new OutboundProcessor();

  // A live bulk data simulation batch
  const batchLeads = [
    {
      businessName: "Silver State Realty Advisors",
      contactName: "David Vance",
      email: "david@silverstaterealty.com",
      phone: "702-555-0122",
      notes: "High volume residential real estate team."
    },
    {
      businessName: "Vegas Valley HVAC & Restoration",
      contactName: "Elena Rostova",
      email: "ELENA@VEGASVALLEYHVAC.COM",
      phone: "702-555-0177",
      notes: "Local mechanical and emergency contracting company."
    },
    {
      businessName: "Broken Data Inc.",
      contactName: "John Doe",
      email: "", // This missing email will trigger our processor's validation failure path safely!
    }
  ];

  console.log("⚡ Firing Up Integrated Agentic Nexus Outbound Engine...\n");

  for (let i = 0; i < batchLeads.length; i++) {
    console.log(`🌀 Processing Batch Item [${i + 1}/${batchLeads.length}]`);
    
    const result = await outboundEngine.processRawOutboundLead(batchLeads[i]);

    if (result.status === 'contacted') {
      console.log(`✅ Success! Prospect Tracking ID: ${result.prospect.id}`);
      console.log(`📬 Status Advanced To: ${result.prospect.status}`);
      console.log(`📨 Live Email Generated:\n"${result.generatedMessage}"\n`);
    } else {
      console.error(`❌ Pipeline Warning for ${result.prospect.businessName}: ${result.error}\n`);
    }
  }

  console.log("🏁 Batch processing simulation complete!");
}

runIntegratedOutboundTest();