import { OutboundSequenceManager } from './src/outbound/sequences/outboundSequence';
import * as dotenv from 'dotenv';
dotenv.config();

async function runDirectEmailTest() {
  const manager = new OutboundSequenceManager();
  
  // Creates a clean test mock object matching your data variables
  const mockProspect = {
    contactName: "Ashley",
    businessName: "Agentic Nexus",
    email: "ashley.hilljames@gmail.com", // 👈 Make sure this matches where you want to receive it!
    notes: "interested in real estate agents"
  };

  console.log("🚀 Launching direct script engine bypassing database tracking...");
  const result = await manager.generateCampaignSequence(mockProspect);
  console.log("🎯 Sequence execution finished!", result);
}

runDirectEmailTest();