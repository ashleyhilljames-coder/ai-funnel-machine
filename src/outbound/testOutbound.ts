import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { OutboundSequenceManager } from './sequences/outboundSequence';
import * as dotenv from 'dotenv';

dotenv.config();

interface LeadRow {
  contactName: string;
  businessName: string;
  email: string;
  notes?: string;
}

async function runDirectOutboundCampaign() {
  console.log('🚀 Initializing Agentic Nexus Direct-to-Resend Engine (No Webhooks)...');

  // TARGET INDOOR INTAKE DIRECTORY
  const intakeDir = path.join(__dirname, '../../intake');
  
  if (!fs.existsSync(intakeDir)) {
    console.error(`❌ Could not locate intake folder at: ${intakeDir}`);
    return;
  }

  // Find any CSV file currently waiting in the intake folder
  const files = fs.readdirSync(intakeDir).filter(file => file.endsWith('.csv'));

  if (files.length === 0) {
    console.log('📋 No pending CSV files found in the intake folder. Drop a sheet in to begin.');
    return;
  }

  const targetFile = files[0];
  const csvPath = path.join(intakeDir, targetFile);
  console.log(`📂 Processing pending file: ${targetFile}`);

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  const records: LeadRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`📋 Found ${records.length} total leads to process inside ${targetFile}.`);

  const sequenceManager = new OutboundSequenceManager();

  for (let i = 0; i < records.length; i++) {
    const lead = records[i];

    console.log(`\n--------------------------------------------`);
    console.log(`⚡ Processing [${i + 1}/${records.length}]: ${lead.businessName}`);
    
    try {
      if (!lead.email || !lead.email.includes('@')) {
        console.warn(`⚠️ Skipping lead due to invalid or missing email: ${lead.email}`);
        continue;
      }

      // This triggers OpenAI generation AND immediate direct Resend dispatch!
      await sequenceManager.generateCampaignSequence('default_client', {
        contactName: lead.contactName,
        businessName: lead.businessName,
        email: lead.email,
        notes: lead.notes
      });

      // ⏱️ Anti-Spam / Rate Limit Buffer
      if (i < records.length - 1) {
        console.log('⏱️ Pausing for 3 seconds to maintain ideal dispatch pacing...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Execution failure on lead row ${i + 1}:`, error);
    }
  }

  // Archive the file manually since we cut out the old router
  const archiveDir = path.join(__dirname, '../../archive');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
  }
  const archivePath = path.join(archiveDir, `processed_${Date.now()}_${targetFile}`);
  fs.renameSync(csvPath, archivePath);
  console.log(`📦 Moved processed lead sheet to archive: ${path.basename(archivePath)}`);

  console.log('\n============================================');
  console.log('🎉 Outbound campaign pipeline fully executed directly via Resend!');
}

runDirectOutboundCampaign();