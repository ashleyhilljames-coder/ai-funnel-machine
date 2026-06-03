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
    this.resultsFilePath = path.join(__dirname, '../../outbound_results.csv');
    this.initializeResultsFile();
  }

  private initializeResultsFile() {
    if (!fs.existsSync(this.resultsFilePath)) {
      const headers = 'Timestamp,Tracking ID,Cleaned Business Name,Cleaned Contact Name,Sanitized Email,Generated Outreach Message\n';
      fs.writeFileSync(this.resultsFilePath, headers, 'utf8');
    }
  }

  private appendResultToCSV(prospect: Prospect, message: string) {
    const timestamp = new Date().toISOString();
    const cleanMessage = message.replace(/\n/g, ' ').replace(/"/g, '""');
    const cleanBusiness = prospect.businessName.replace(/"/g, '""');
    const cleanContact = prospect.contactName.replace(/"/g, '""');

    const csvRow = `"${timestamp}","${prospect.id}","${cleanBusiness}","${cleanContact}","${prospect.email}","${cleanMessage}"\n`;
    fs.appendFileSync(this.resultsFilePath, csvRow, 'utf8');
  }

  /**
   * ADVANCED DATA CLEANER: Strips messy corporate suffixes, trailing punctuation, 
   * and normalizes spacing to make corporate names sound completely human.
   */
  private cleanBusinessName(rawName: string): string {
    if (!rawName) return '';
    
    let name = rawName.trim();
    
    // Regex pattern to remove variations of LLC, Inc, Ltd, Corp, Co, and trailing commas/periods
    const corporateSuffixRegex = /([,\s]+(llc|inc|ltd|corp|corporation|co|incorporated|group))([.\s]*)$/i;
    name = name.replace(corporateSuffixRegex, '');
    
    // Clean up any double spaces or leftover trailing punctuation
    name = name.replace(/\s+/g, ' ');
    name = name.replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '');
    
    return name.trim();
  }

  /**
   * CONTACT NAME SANITIZER: Validates formatting or defaults to a professional greeting if blank.
   */
  private cleanContactName(rawName: string): string {
    if (!rawName || rawName.trim().length === 0) {
      return 'Valued Partner';
    }
    return rawName.trim().replace(/\s+/g, ' ');
  }

  /**
   * ORCHESTRATION LAYER: Cleans, maps, runs AI, and outputs data
   */
  public async processRawOutboundLead(rawLead: any): Promise<OutboundProcessResult> {
    try {
      if (!rawLead.businessName || !rawLead.email) {
        return {
          status: 'failed',
          prospect: rawLead,
          error: 'Missing vital prospect identification fields (businessName or email).'
        };
      }

      // 🔥 RUN THE INTUITIVE CLEANING PIPELINE LIVE BEFORE PASSING TO AI 🔥
      const polishedBusinessName = this.cleanBusinessName(rawLead.businessName);
      const polishedContactName = this.cleanContactName(rawLead.contactName);
      const polishedEmail = rawLead.email.toLowerCase().trim();

      const structuredProspect: Prospect = {
        id: rawLead.id || `prospect_${Math.random().toString(36).substr(2, 9)}`,
        businessName: polishedBusinessName,
        contactName: polishedContactName,
        email: polishedEmail,
        notes: rawLead.notes ? rawLead.notes.trim() : '',
        status: 'cold',
        outboundSequenceStage: 1
      };

      const generatedMessage = await this.sequenceManager.generateOutreachMessage(structuredProspect);
      const finalProspect = this.sequenceManager.advanceStage(structuredProspect);

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