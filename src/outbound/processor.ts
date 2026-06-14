import { GoogleGenAI } from '@google/genai';
import { OutboundSequenceManager } from './sequences/outboundSequence'; // Import the direct Resend engine

export interface LeadVector {
  businessName: string;
  contactName: string;
  email: string;
  niche: string;
}

export interface ProcessingResult {
  status: 'contacted' | 'failed';
  prospect: { id: string };
  sequence?: {
    day1Email: string;
  };
  error?: string;
}

export class OutboundProcessor {
  private ai: GoogleGenAI;
  private mailer: OutboundSequenceManager; // New mailer instance

  constructor() {
    this.ai = new GoogleGenAI({});
    this.mailer = new OutboundSequenceManager(); // Initialize the engine
  }

  private getNicheSystemPrompt(niche: any): string {
    if (!niche || typeof niche !== 'string') {
      return `You are an elite B2B copywriter representing Ashley from Agentic Nexus. Keep it under 4 sentences. Focus on 24/7 AI intake.`;
    }

    const cleanNiche = niche.toLowerCase().trim();

    if (cleanNiche.includes('roof') || cleanNiche.includes('mitigation') || cleanNiche.includes('contractor')) {
      return `You are an elite B2B copywriter for Agentic Nexus writing to contractors. 
      Focus on 24/7 emergency response and capturing leads that usually hit voicemail. 
      Tone: Peer-to-peer, zero hype, under 4 sentences. 
      Ask if they use automation for after-hours calls.`;
    }

    return `You are an elite B2B copywriter for Agentic Nexus. Tone is conversational and direct. Focus on saving manual labor.`;
  }

  public async processRawOutboundLead(lead: LeadVector): Promise<ProcessingResult> {
    try {
      const bizName = lead.businessName || 'Business Owner';
      const contact = lead.contactName || 'there';
      const cleanBusinessName = bizName.replace(/\b(llc|inc|co|corp|& mitigation|group)\b/gi, '').trim();
      const baseTrackingId = `prospect_${Math.random().toString(36).substring(2, 10)}`;
      
      const activeSystemPrompt = this.getNicheSystemPrompt(lead.niche);

      // Trigger the existing OutboundSequenceManager to generate AND SEND via Resend
      const result = await this.mailer.generateCampaignSequence({
        contactName: contact,
        businessName: cleanBusinessName,
        email: lead.email,
        notes: lead.niche
      });

      return {
        status: 'contacted',
        prospect: { id: baseTrackingId },
        sequence: {
          day1Email: result.day1Email
        }
      };

    } catch (error: any) {
      console.error(`❌ Processor failure for ${lead.email}:`, error.message);
      return {
        status: 'failed',
        prospect: { id: 'failed_run' },
        error: error.message
      };
    }
  }
}