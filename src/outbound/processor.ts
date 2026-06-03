import { LeadScraper } from './scrapers/leadScraper';
import { OutboundSequenceManager } from './sequences/outboundSequence';
import { Prospect } from './models/prospect';

export interface OutboundProcessorResult {
  prospect: Prospect;
  generatedMessage: string;
  status: 'cold' | 'contacted' | 'failed';
  error?: string;
}

export class OutboundProcessor {
  private scraper: LeadScraper;
  private sequenceManager: OutboundSequenceManager;

  constructor() {
    this.scraper = new LeadScraper();
    this.sequenceManager = new OutboundSequenceManager();
  }

  /**
   * Processes a single raw outbound lead through the cleanup and messaging pipeline.
   */
  public async processRawOutboundLead(rawData: {
    businessName: string;
    contactName: string;
    email: string;
    phone?: string;
    website?: string;
    notes?: string;
  }): Promise<OutboundProcessorResult> {
    try {
      // Step 1: Sanitize and clean the raw scraped lead data
      const cleanProspect = this.scraper.parseRawLead(rawData);
      
      // Step 2: Generate the initial outreach sequence message
      const message = await this.sequenceManager.generateOutreachMessage(cleanProspect);
      
      // Step 3: Advance the sequence tracking stage to 'Contacted'
      const updatedProspect = this.sequenceManager.advanceStage(cleanProspect);

      return {
        prospect: updatedProspect,
        generatedMessage: message,
        status: 'contacted'
      };

    } catch (err: any) {
      return {
        prospect: {
          id: 'FAILED_PROSPECT',
          businessName: rawData.businessName || 'Unknown Business',
          contactName: rawData.contactName || 'Unknown Contact',
          email: rawData.email || 'unknown@email.com',
          status: 'cold',
          outboundSequenceStage: 1,
          notes: `Failed processing: ${err.message}`
        },
        generatedMessage: '',
        status: 'failed',
        error: err.message
      };
    }
  }
}