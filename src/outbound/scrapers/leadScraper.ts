import { Prospect } from '../models/prospect';
import { v4 as uuidv4 } from 'uuid';

export class LeadScraper {
  /**
   * Sanitizes and parses raw input data into a clean Prospect model.
   * This structure works whether the data comes from a real estate list 
   * or a local restoration/contracting business directory.
   */
  public parseRawLead(rawData: {
    businessName: string;
    contactName: string;
    email: string;
    phone?: string;
    website?: string;
    notes?: string;
  }): Prospect {
    if (!rawData.businessName || !rawData.contactName || !rawData.email) {
      throw new Error("Missing required lead information: businessName, contactName, and email are mandatory.");
    }

    return {
      id: uuidv4(),
      businessName: rawData.businessName.trim(),
      contactName: rawData.contactName.trim(),
      email: rawData.email.trim().toLowerCase(),
      phone: rawData.phone?.trim(),
      website: rawData.website?.trim(),
      status: 'cold',
      outboundSequenceStage: 1, // Always start cold outreach at Stage 1
      notes: rawData.notes || 'Manually imported lead data.',
    };
  }
}