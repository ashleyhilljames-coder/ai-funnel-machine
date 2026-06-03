import { GoogleGenAI } from '@google/genai';

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
    day3FollowUp: string;
    day5LinkedIn: string;
  };
  error?: string;
}

export class OutboundProcessor {
  private ai: GoogleGenAI;

  constructor() {
    // Correctly passes an options object config shell required by the new SDK type system
    this.ai = new GoogleGenAI({});
  }

  /**
   * Dynamically selects tailored system instructions based on the target industry sector.
   * Safe-guarded against missing properties or non-string inputs to prevent 'toLowerCase' crashes.
   */
  private getNicheSystemPrompt(niche: any): string {
    if (!niche || typeof niche !== 'string') {
      return `You are an elite B2B copywriter representing Agentic Nexus. You are writing to a business owner.
Your tone is conversational, confident, and direct.
Focus on how custom AI agents streamline workflows, automate redundant data entries, qualify incoming cold traffic automatically, and save hours of manual administrative labor.`;
    }

    const cleanNiche = niche.toLowerCase().trim();

    // 🏗️ INDUSTRY TRACK 1: ROOFING & HOME SERVICES / CONTRACTORS
    if (cleanNiche.includes('roof') || cleanNiche.includes('mitigation') || cleanNiche.includes('contractor')) {
      return `You are an elite B2B copywriter representing Agentic Nexus. You are writing to home service contractors and roofing companies.
Your tone is direct, blue-collar professional, and hyper-focused on speed-to-lead.
Highlight how custom AI voice or chat agents solve their exact pain points: automating immediate dispatch for storm leads, capturing emergency mitigation inquiries 24/7, and qualifying estimate requests instantly so they don't lose jobs to faster competitors.`;
    }

    // 🏢 INDUSTRY TRACK 2: REAL ESTATE & PROPERTY MANAGEMENT
    if (cleanNiche.includes('real estate') || cleanNiche.includes('property') || cleanNiche.includes('rentals') || cleanNiche.includes('highrise')) {
      return `You are an elite B2B copywriter representing Agentic Nexus. You are writing to property management executives and real estate operators.
Your tone is polished, corporate, and highly strategic.
Highlight how custom AI agents solve their exact operational bottlenecks: qualifying inbound tenant or buyer inquiries automatically, streamlining rental application triage, optimizing maintenance request routing, and maximizing occupancy retention rates.`;
    }

    // 🌐 DEFAULT FALLBACK: GENERAL AI AUTOMATION VALUE PROP
    return `You are an elite B2B copywriter representing Agentic Nexus. You are writing to a business owner.
Your tone is conversational, confident, and direct.
Focus on how custom AI agents streamline workflows, automate redundant data entries, qualify incoming cold traffic automatically, and save hours of manual administrative labor.`;
  }

  /**
   * Processes a single lead vector, scrubs company noise, and compiles a highly tailored 3-step outreach sequence
   */
  public async processRawOutboundLead(lead: LeadVector): Promise<ProcessingResult> {
    try {
      // Safe guard parsing checks to ensure name fields exist as strings
      const bizName = lead.businessName || 'Business Owner';
      const contact = lead.contactName || 'there';

      const cleanBusinessName = bizName
        .replace(/\b(llc|inc|co|corp|incorporated|limited|ltd|& mitigation|group)\b/gi, '')
        .trim();

      const baseTrackingId = `prospect_${Math.random().toString(36).substring(2, 10)}`;
      const activeSystemPrompt = this.getNicheSystemPrompt(lead.niche);

      const userPrompt = `Generate a high-converting 3-step outreach sequence for ${contact} at ${cleanBusinessName}. 
The sequence MUST include a Day 1 Email, a Day 3 follow-up bump, and a Day 5 LinkedIn connection message.
Keep it punchy, completely natural, and do not use generic AI buzzwords or standard corporate fluff.`;

      // Executing call using official @google/genai structural parameters
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: activeSystemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              day1Email: { type: 'STRING' },
              day3FollowUp: { type: 'STRING' },
              day5LinkedIn: { type: 'STRING' },
            },
            required: ['day1Email', 'day3FollowUp', 'day5LinkedIn'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error("Received an empty model generation response stream.");

      const sequence = JSON.parse(responseText);

      return {
        status: 'contacted',
        prospect: { id: baseTrackingId },
        sequence: {
          day1Email: sequence.day1Email,
          day3FollowUp: sequence.day3FollowUp,
          day5LinkedIn: sequence.day5LinkedIn
        }
      };

    } catch (error: any) {
      return {
        status: 'failed',
        prospect: { id: 'failed_run' },
        error: error.message
      };
    }
  }
}