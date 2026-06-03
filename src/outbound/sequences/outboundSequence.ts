import { Prospect } from '../models/prospect';
import { OpenAI } from 'openai';

export interface CampaignSequence {
  day1Email: string;
  day3FollowUp: string;
  day5LinkedIn: string;
}

export class OutboundSequenceManager {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'MOCK_KEY',
    });
  }

  /**
   * Generates a complete 3-step multi-channel outreach campaign sequence with dynamic niche fallback injection.
   */
  public async generateCampaignSequence(prospect: Prospect): Promise<CampaignSequence> {
    const systemPrompt = `You are an elite B2B growth agent for Agentic Nexus, a premier AI consulting agency. 
Your goal is to write natural, short, impactful outreach copy that feels 100% human-written and completely free of artificial corporate fluff.`;

    const userPrompt = `Prospect Information:
- Business Name: ${prospect.businessName}
- Contact Person: ${prospect.contactName}
- Context Niche: ${prospect.notes}

Generate a 3-part communication sequence. Output EXACTLY in this JSON format with nothing else (no markdown blocks, no extra text):
{
  "day1Email": "A 2-3 sentence introductory opening pitch asking how they handle qualifying incoming leads.",
  "day3FollowUp": "A 1-2 sentence quick email follow-up offering a free 15-minute workflow automation audit.",
  "day5LinkedIn": "A casual LinkedIn connection message under 300 characters tailored to their industry."
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const rawJson = response.choices[0]?.message?.content;
      if (!rawJson) throw new Error("Empty response from OpenAI");

      return JSON.parse(rawJson) as CampaignSequence;

    } catch (error: any) {
      // 🔥 INTELLIGENT NICHE ADAPTER INJECTION FALLBACK BLOCK 🔥
      const notesLower = (prospect.notes || '').toLowerCase();
      const businessLower = prospect.businessName.toLowerCase();
      
      // 🏘️ Strategy Alpha: Real Estate Target Niche
      if (notesLower.includes('real estate') || notesLower.includes('highrise') || businessLower.includes('real estate') || businessLower.includes('group')) {
        return {
          day1Email: `Hi ${prospect.contactName}, noticed your listings in the area. Have you considered using custom AI agents to qualify incoming buyer and listing leads automatically?`,
          day3FollowUp: `Hi ${prospect.contactName}, just trailing back on this. Would you be open to a quick 15-minute operational audit to see how we can capture more hot inquiries for ${prospect.businessName}?`,
          day5LinkedIn: `Hey ${prospect.contactName}, love your presence in the local real estate market. Let's connect here!`
        };
      } 
      
      // 🔨 Strategy Beta: Contractor / Roofing Target Niche
      if (notesLower.includes('roof') || notesLower.includes('mitigation') || businessLower.includes('roof') || businessLower.includes('contractor')) {
        return {
          day1Email: `Hi ${prospect.contactName}, noticed your work handling roofing and mitigation inquiries. Have you considered using custom AI voice or chat agents to qualify estimate requests and storm leads automatically?`,
          day3FollowUp: `Hi ${prospect.contactName}, following up on this. Would you be open to a quick 15-minute operational audit to see how we can automate immediate dispatch responses for ${prospect.businessName}?`,
          day5LinkedIn: `Hey ${prospect.contactName}, always great connecting with top industry contractors. Love your work at ${prospect.businessName}. Let's connect!`
        };
      }

      // 🌐 Strategy Gamma: Standard Generic Fallback Layout
      return {
        day1Email: `Hi ${prospect.contactName}, noticed your work at ${prospect.businessName}. Have you considered leveraging custom AI agents to qualify your incoming leads automatically?`,
        day3FollowUp: `Hi ${prospect.contactName}, just trailing back on this. Would you be open to a quick 15-minute operational workflow audit for ${prospect.businessName} next week?`,
        day5LinkedIn: `Hey ${prospect.contactName}, love what you're building at ${prospect.businessName}. Let's connect here!`
      };
    }
  }

  public advanceStage(prospect: Prospect): Prospect {
    return {
      ...prospect,
      status: 'contacted',
      outboundSequenceStage: 2,
    };
  }
}