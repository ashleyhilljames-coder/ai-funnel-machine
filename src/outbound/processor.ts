import { Prospect } from './models/prospect';
import { OutboundSequenceManager } from './sequences/outboundSequence';
import * as fs from 'fs';
import * as path from 'path';

export interface OutboundProcessResult {
  status: 'contacted' | 'failed';
  prospect: Prospect;
  generatedMessage?: string;
  error?: string;
}

export class OutboundProcessor {
  private sequenceManager: OutboundSequenceManager;
  private resultsFilePath: string;

  constructor() {
    this.sequenceManager = new OutboundSequenceManager();
    // Output files will be neatly saved right in your main project folder
    this.resultsFilePath = path.join(__dirname, '../../outbound_results.csv');
    this.initializeResultsFile();
  }

  /**
   * Creates the outbound results CSV file with a clean header column if it doesn't exist yet.
   */
  private initializeResultsFile() {
    if (!fs.existsSync(this.resultsFilePath)) {
      const headers = 'Timestamp,Tracking ID,Business Name,Contact Name,Email,Generated Outreach Message\n';
      fs.writeFileSync(this.resultsFilePath, headers, 'utf8');
    }
  }

  /**
   * Appends a single successfully processed campaign row to your output spreadsheet.
   */
  private appendResultToCSV(prospect: Prospect, message: string) {
    const timestamp = new Date().toISOString();
    
    // Sanitize message strings: remove newlines and escape quotes to keep CSV formatting perfectly intact
    const cleanMessage = message.replace(/\n/g, ' ').replace(/"/g, '""');
    const cleanBusiness = prospect.businessName.replace(/"/g, '""');
    const cleanContact = prospect.contactName.replace(/"/g, '""');

    const csvRow = `"${timestamp}","${prospect.id}","${cleanBusiness}","${cleanContact}","${prospect.email}","${cleanMessage}"\n`;
    
    fs.appendFileSync(this.resultsFilePath, csvRow, 'utf8');
  }

  /**
   * Orchestrates validation, state mutation, AI generation, and file exporting for an outbound lead.
   */
  public async processRawOutboundLead(rawLead: any): Promise<OutboundProcessResult> {
    try {
      // 1. Basic Ingestion Validation
      if (!rawLead.businessName || !rawLead.email) {
        return {
          status: 'failed',
          prospect: rawLead,
          error: 'Missing vital prospect identification fields (businessName or email).'
        };
      }

      // 2. Normalize and Map to Structured Model Types
      const structuredProspect: Prospect = {
        id: rawLead.id || `prospect_${Math.random().toString(36).substr(2, 9)}`,
        businessName: rawLead.businessName.trim(),
        contactName: rawLead.contactName ? rawLead.contactName.trim() : 'Valued Partner',
        email: rawLead.email.toLowerCase().trim(),
        notes: rawLead.notes ? rawLead.notes.trim() : '',
        status: 'cold',
        outboundSequenceStage: 1
      };

      // 3. Generate Personalization Copy via AI Layer
      const generatedMessage = await this.sequenceManager.generateOutreachMessage(structuredProspect);

      // 4. Update Sequence Progression States
      const finalProspect = this.sequenceManager.advanceStage(structuredProspect);

      // 5. Export directly to local spreadsheet ledger
      this.appendResultToCSV(finalProspect, generatedMessage);

      return {
        status: 'contacted',
        prospect: finalProspect,
        generatedMessage
      };

    } catch (err: any) {
      return {
        status: 'failed',
        prospect: rawLead,
        error: `Internal Pipeline Processing Error: ${err.message}`
      };
    }
  }
}