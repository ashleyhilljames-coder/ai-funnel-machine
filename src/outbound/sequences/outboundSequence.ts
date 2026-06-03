import { Prospect } from '../models/prospect';
import { OpenAI } from 'openai';

export class OutboundSequenceManager {
  private openai: OpenAI;

  constructor() {
    // Automatically reads your OPENAI_API_KEY from your root .env file!
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'MOCK_KEY',
    });
  }

  /**
   * Generates a completely customized, context-aware outreach email using GPT-5.4 Mini.
   */
  public async generateOutreachMessage(prospect: Prospect): Promise<string> {
    const systemPrompt = `You are an elite B2B growth agent for Agentic Nexus, a premier AI consulting agency. 
Your goal is to write a compelling, single-paragraph outreach pitch tailored directly to a prospect's unique background.
Keep the tone natural, direct, highly professional, and completely free of artificial corporate fluff.`;

    const userPrompt = `Prospect Information:
- Business Name: ${prospect.businessName}
- Contact Person: ${prospect.contactName}
- Specific Target Context: ${prospect.notes}

Write a 2-3 sentence email opening pitch. Introduce Agentic Nexus casually, acknowledge their unique focus or industry details provided in the context notes, and ask a direct question about how they currently automate incoming lead qualification or operational workflows. Reference their business and name naturally. Do not include subject lines or formal sign-offs—just return the body text.`;

    try {
      // Use the hyper-efficient gpt-5.4-mini model for fast, budget-friendly generation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      const message = response.choices[0]?.message?.content;
      if (!message) {
        throw new Error("OpenAI returned an empty response choices array.");
      }

      return message.trim();

    } catch (error: any) {
      console.warn(`⚠️ OpenAI API Generation failed: ${error.message}. Dropping back to resilient core template.`);
      // Safe, automated engineering fallback layout if the API fails or is unauthenticated
      return `Hi ${prospect.contactName}, noticed your listings in the area. Have you considered using AI agents to qualify your incoming leads automatically?`;
    }
  }

  /**
   * Simple state tracking modifier to advance a prospect to stage 2.
   */
  public advanceStage(prospect: Prospect): Prospect {
    return {
      ...prospect,
      status: 'contacted',
      outboundSequenceStage: 2,
    };
  }
}