import { Prospect } from './models/prospect';
import { OutboundSequenceManager, CampaignSequence } from './sequences/outboundSequence';
import * as fs from 'fs';
import * as path from 'path';

export interface OutboundProcessResult {
  status: 'contacted' | 'failed';
  prospect: Prospect;
  sequence?: CampaignSequence;
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
    // Delete the old single-column file format if it exists so it recreates with the fresh new header structure
    if (fs.existsSync(this.resultsFilePath)) {
      fs.unlinkSync(this.resultsFilePath);
    }
    const headers = 'Timestamp,Tracking ID,Cleaned Business Name,Cleaned Contact Name,Sanitized Email,Day 1 Email,Day 3 Follow Up,Day 5 LinkedIn\n';
    fs.writeFileSync(this.resultsFilePath, headers, 'utf8');
  }

  private appendResultToCSV(prospect: Prospect, seq: CampaignSequence) {
    const timestamp = new Date().toISOString();
    
    const cleanBusiness = prospect.businessName.replace(/"/g, '""');
    const cleanContact = prospect.contactName.replace(/"/g, '""');
    
    // Sanitize all 3 sequence steps cleanly for CSV storage
    const d1 = seq.day1Email.replace(/\n/g, ' ').replace(/"/g, '""');
    const d3 = seq.day3FollowUp.replace(/\n/g, ' ').replace(/"/g, '""');
    const d5 = seq.day5LinkedIn.replace(/\n/g, ' ').replace(/"/g, '""');

    const csvRow = `"${timestamp}","${prospect.id}","${cleanBusiness}","${cleanContact}","${prospect.email}","${d1}","${d3}","${d5}"\n`;
    fs.appendFileSync(this.resultsFilePath, csvRow, 'utf8');
  }

  private cleanBusinessName(rawName: string): string {
    if (!rawName) return '';
    let name = rawName.trim();
    const corporateSuffixRegex = /([,\s]+(llc|inc|ltd|corp|corporation|co|incorporated|group))([.\s]*)$/i;
    name = name.replace(corporateSuffixRegex, '');
    name = name.replace(/\s+/g, ' ');
    name = name.replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '');
    return name.trim();
  }

  private cleanContactName(rawName: string): string {
    if (!rawName || rawName.trim().length === 0) return 'Valued Partner';
    return rawName.trim().replace(/\s+/g, ' ');
  }

  public async processRawOutboundLead(rawLead: any): Promise<OutboundProcessResult> {
    try {
      if (!rawLead.businessName || !rawLead.email) {
        return {
          status: 'failed',
          prospect: rawLead,
          error: 'Missing vital prospect identification fields.'
        };
      }

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

      // 🔥 Generate the multi-step sequence campaign array live!
      const campaignSequence = await this.sequenceManager.generateCampaignSequence(structuredProspect);
      const finalProspect = this.sequenceManager.advanceStage(structuredProspect);

      // Append all columns cleanly to our export ledger
      this.appendResultToCSV(finalProspect, campaignSequence);

      return {
        status: 'contacted',
        prospect: finalProspect,
        sequence: campaignSequence
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