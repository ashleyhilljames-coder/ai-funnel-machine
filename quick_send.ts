import { OutboundSequenceManager, TEST_CONFIG } from './src/outbound/sequences/outboundSequence';
import * as dotenv from 'dotenv';
dotenv.config();

async function runDirectEmailTest() {
  const manager = new OutboundSequenceManager();
  
  // Creates a clean test mock object matching target contact details
  const mockProspect = {
    contactName: process.env.TEST_TARGET_NAME || TEST_CONFIG.TARGET_CONTACT.name,
    businessName: "Quality Roofing & Mitigation",
    email: process.env.TEST_TARGET_EMAIL || "RBUTLER@qualityroofinglv.com",
    notes: "Property restoration and emergency mitigation manager"
  };

  console.log("=========================================================================");
  console.log("🚀 Launching direct email dispatch test engine...");
  console.log(`👤 Target Contact Name: ${mockProspect.contactName}`);
  console.log(`📧 Target Email Address: ${mockProspect.email}`);
  console.log("=========================================================================\n");

  const result = await manager.generateCampaignSequence('default_client', mockProspect);
  
  console.log("\n=========================================================================");
  console.log("🎯 OUTREACH EMAIL DRAFT & DISPATCH RESULT");
  console.log("=========================================================================");
  console.log(`Subject:   ${result.subject}`);
  console.log(`Recipient: ${result.recipient}`);
  console.log("-------------------------------------------------------------------------");
  console.log("Email Body:\n");
  console.log(result.day1Email);
  console.log("=========================================================================\n");
}

runDirectEmailTest();