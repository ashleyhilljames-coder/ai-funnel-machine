import { Resend } from 'resend';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import { LeadGuard } from '../leadGuard';

const leadGuard = new LeadGuard();

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
  async generateSequenceDraft(
    prospect: Prospect, 
    templateNiche: string = 'mitigation',
    customTemplate?: { subject_template: string; body_prompt: string; is_static: number }
  ): Promise<{ subject: string; body: string }> {
    console.log(`\n🧠 AI is crafting a draft campaign for ${prospect.businessName} using template "${templateNiche}"...`);

    const replaceTokens = (text: string) => {
      return text
        .replace(/{businessName}/g, prospect.businessName)
        .replace(/{contactName}/g, prospect.contactName);
    };

    if (customTemplate) {
      const subject = replaceTokens(customTemplate.subject_template);
      if (customTemplate.is_static === 1) {
        const body = replaceTokens(customTemplate.body_prompt);
        return { subject, body };
      }
      
      // If AI template, use the body_prompt as the systemPrompt
      let systemPrompt = customTemplate.body_prompt;
      const userPrompt = `Prospect Details:
- Contact Name: ${prospect.contactName}
- Business Name: ${prospect.businessName}
- Industry/Notes: ${prospect.notes || 'General Business/Inbound Operations'}

Write only the body of the email starting directly after the greeting. Do not include a subject line or sign-off block.`;

      let emailBodyText = "";
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
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

      const body = `Hi ${prospect.contactName},\n\n${emailBodyText}\n\nBest,\n\nAshley | Agentic Nexus`;
      return { subject, body };
    }

    let systemPrompt = "";
    let subject = "";

    const nicheLower = templateNiche.toLowerCase().trim();

    if (nicheLower === 'roofing') {
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for commercial roofing contractors.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: during roof leaks or storm events, high-ticket roofing leads call in and want immediate response. If they hit voicemail, they call the next roofer.
- Mention how a 24/7 AI receptionist answers immediately, collects leak/building details, and books inspections on the spot.
- End with a low-friction question asking if they are currently using automation to capture after-hours inbound calls.`;
      subject = `Roofing dispatch question - ${prospect.businessName}`;
    } else if (nicheLower === 'property') {
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for property management and maintenance operations.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: handling tenant emergency maintenance requests after hours is a labor-intensive, expensive process prone to tenant complaints and dispatch delays.
- Mention how a 24/7 AI maintenance intake agent handles tenant calls, qualifies the severity of the issue, and books emergency dispatches instantly.
- End with a low-friction question asking if they are currently using automation to coordinate tenant emergency dispatches.`;
      subject = `Tenant maintenance intake for ${prospect.businessName}`;
    } else if (nicheLower === 'realestate') {
      systemPrompt = `You are an expert B2B/B2C outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: residential buyers who hit voicemail when trying to schedule showing tours will immediately contact another listing agent.
- Mention how a 24/7 AI virtual tour booking assistant routes qualified showings instantly.
- End with a low-friction question asking if they are currently using automation to capture showing inquiries.`;
      subject = `Home showing question - ${prospect.businessName}`;
    } else {
      // default: mitigation / restoration
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Agentic Nexus. 
Your agency builds custom AI intake and lead-qualification agents specifically for emergency mitigation and restoration contractors.
Write a short, direct, and completely hype-free Day 1 cold outreach email.
- Keep it strictly under 4 sentences and write in a casual, peer-to-peer tone.
- Do NOT use cheesy marketing terms, corporate buzzwords, or fake compliments.
- Focus heavily on the exact pain point: when crews are out on a job, incoming water/fire emergency calls go to voicemail, losing $10k+ mitigation jobs to competitors.
- Mention how a 24/7 AI intake agent qualifies emergency leads instantly so they never miss a dispatch.
- End with a low-friction question asking if they are currently using automation to capture after-hours inbound calls.`;
      subject = `Quick question regarding ${prospect.businessName}`;
    }

    const userPrompt = `Prospect Details:
- Contact Name: ${prospect.contactName}
- Business Name: ${prospect.businessName}
- Industry/Notes: ${prospect.notes || 'General Business/Inbound Operations'}

Write only the body of the email starting directly after the greeting. Do not include a subject line or sign-off block.`;

    let emailBodyText = "";

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    const body = `Hi ${prospect.contactName},\n\n${emailBodyText}\n\nBest,\n\nAshley | Agentic Nexus`;

    return { subject, body };
  }

  async generateCampaignSequence(clientId: string = 'default_client', prospect: Prospect): Promise<CampaignResult> {
    const draft = await this.generateSequenceDraft(prospect, 'mitigation');
    await sendOutboundEmail(clientId, {
      to: prospect.email,
      subject: draft.subject,
      htmlContent: draft.body.replace(/\n/g, '<br>')
    });
    return {
      day1Email: draft.body
    };
  }
}

export async function sendOutboundEmail(clientId: string, payload: { to: string; subject: string; htmlContent: string }) {
  try {
    const settings = leadGuard.getClientSettings(clientId);
    const apiKey = (settings && settings.resendApiKey) ? settings.resendApiKey : process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ [Outbound Sequence] Resend Email skipped: RESEND_API_KEY is missing');
      return { success: false, error: new Error('RESEND_API_KEY is missing') };
    }
    const resendClient = new Resend(apiKey);
    const { data, error } = await resendClient.emails.send({
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