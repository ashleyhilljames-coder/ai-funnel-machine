import { Resend } from 'resend';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Force load environment variables
dotenv.config();

// Initialize our two core engines
const resend = new Resend(process.env.RESEND_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Prospect {
  contactName: string;
  businessName: string;
  email: string;
  notes?: string;
}

interface CampaignResult {
  day1Email: string;
}

export class OutboundSequenceManager {
  async generateCampaignSequence(prospect: Prospect): Promise<CampaignResult> {
    console.log(`\n🧠 AI is analyzing and crafting a custom pitch for ${prospect.businessName}...`);

    // Define a highly tailored system prompt for your agency's voice
   const systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for high-ticket home service contractors and mitigation companies.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: when crews are out on a restoration or roof job, incoming emergency calls go to voicemail, which means losing a $10k+ project to a competitor.
- Mention how a 24/7 AI intake agent qualifies these emergency leads instantly so they never miss a job.
- End with a low-friction question asking if they are currently using automation to capture after-hours inbound calls.`;

    const userPrompt = `Prospect Details:
- Contact Name: ${prospect.contactName}
- Business Name: ${prospect.businessName}
- Industry/Notes: ${prospect.notes || 'General Business/Inbound Operations'}

Write only the body of the email starting directly after the greeting. Do not include a subject line or sign-off block.`;

    let emailBodyText = "";

    try {
      // Execute the OpenAI generation stream
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast, cheap, and excellent for specialized text formatting
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      });

      emailBodyText = completion.choices[0].message?.content?.trim() || "";
    } catch (aiError) {
      console.error('⚠️ OpenAI generation failed, falling back to core baseline copy:', aiError);
      emailBodyText = `I noticed your business operations online and wanted to see if you've looked into streamlining your intake systems using custom automation setups.`;
    }

    // Compile the final polished structure
    const finalEmail = `Hi ${prospect.contactName},\n\n${emailBodyText}\n\nBest,\n\nAshley | Agentic Nexus`;

    // Fire the transmission pipeline
    await sendOutboundEmail({
      to: prospect.email,
      subject: `Quick question regarding ${prospect.businessName}`,
      htmlContent: finalEmail.replace(/\n/g, '<br>')
    });

    return {
      day1Email: finalEmail
    };
  }
}

export async function sendOutboundEmail(payload: { to: string; subject: string; htmlContent: string }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Ashley | Agentic Nexus <ashley.hilljames@agenticnexus.vip>',
      to: [payload.to],
      subject: payload.subject,
      html: payload.htmlContent,
    });

    if (error) {
      console.error('❌ Resend API gateway rejected dispatch:', error);
      return { success: false, error };
    }

    console.log(`🚀 Dispatch successful! Message ID: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Network execution failure during email transit:', error);
    return { success: false, error };
  }
}