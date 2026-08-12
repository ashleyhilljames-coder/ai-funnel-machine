import { GoogleGenAI } from '@google/genai';
import { OutboundSequenceManager } from './sequences/outboundSequence';

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
  private mailer: OutboundSequenceManager;

  constructor() {
    this.ai = new GoogleGenAI({});
    this.mailer = new OutboundSequenceManager();
  }

  private getNicheSystemPrompt(niche: any): string {
    if (!niche || typeof niche !== 'string') {
      return `You are an expert B2B copywriter for Syncro Scale. Tone is direct and professional. Focus on 24/7 emergency dispatch intake for property restoration and mitigation managers. Keep under 4 sentences.`;
    }

    const cleanNiche = niche.toLowerCase().trim();

    if (cleanNiche.includes('roof') || cleanNiche.includes('mitigation') || cleanNiche.includes('restoration') || cleanNiche.includes('contractor')) {
      return `You are an expert B2B copywriter for Syncro Scale writing to property restoration and mitigation managers. 
      Focus on 24/7 emergency response and capturing high-value mitigation leads that hit voicemail while crews are on-site. 
      Tone: Professional, direct B2B, zero sales hype, under 4 sentences. 
      End with a clear CTA asking for a 10-minute preview call.`;
    }

    return `You are an expert B2B copywriter for Syncro Scale. Tone is conversational, direct, and professional. Focus on operational automation.`;
  }

  public async generateLeadDraft(
    lead: LeadVector, 
    templateNiche: string,
    customTemplate?: { subject_template: string; body_prompt: string; is_static: number }
  ): Promise<{ subject: string; body: string }> {
    const bizName = lead.businessName || 'Quality Roofing & Mitigation';
    const contact = lead.contactName || 'Robert Butler';
    const cleanBusinessName = bizName.replace(/\b(llc|inc|co|corp|group)\b/gi, '').trim();

    return this.mailer.generateSequenceDraft({
      contactName: contact,
      businessName: cleanBusinessName,
      email: lead.email,
      notes: lead.niche
    }, templateNiche, customTemplate);
  }

  public async processRawOutboundLead(clientId: string, lead: LeadVector): Promise<ProcessingResult> {
    try {
      const bizName = lead.businessName || 'Quality Roofing & Mitigation';
      const contact = lead.contactName || 'Robert Butler';
      const cleanBusinessName = bizName.replace(/\b(llc|inc|co|corp|group)\b/gi, '').trim();
      const baseTrackingId = `prospect_${Math.random().toString(36).substring(2, 10)}`;

      // Trigger the existing OutboundSequenceManager to generate AND DISPATCH email
      const result = await this.mailer.generateCampaignSequence(clientId, {
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