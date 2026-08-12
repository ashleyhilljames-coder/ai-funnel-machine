import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import { LeadGuard } from '../leadGuard';
import { dispatchEmail } from '../../services/emailService';

const leadGuard = new LeadGuard();

// Force load environment variables
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const TEST_CONFIG = {
  TEST_MODE: true,
  TARGET_CONTACT: {
    name: process.env.TEST_TARGET_NAME || 'Robert Butler',
    email: process.env.TEST_TARGET_EMAIL || 'RBUTLER@qualityroofinglv.com',
    phone: '+17024919899',
    role: 'Mitigation Manager',
    company: 'Quality Roofing & Mitigation',
  },
  SENDER_SIGNATURE: 'Ashley | Syncro Scale',
};

interface Prospect {
  contactName: string;
  businessName: string;
  email: string;
  notes?: string;
}

interface CampaignResult {
  day1Email: string;
  subject?: string;
  recipient?: string;
}

export class OutboundSequenceManager {
  async generateSequenceDraft(
    prospect: Prospect, 
    templateNiche: string = 'mitigation',
    customTemplate?: { subject_template: string; body_prompt: string; is_static: number }
  ): Promise<{ subject: string; body: string }> {
    // Override prospect info when TEST_MODE is active
    const activeProspect = TEST_CONFIG.TEST_MODE
      ? {
          ...prospect,
          contactName: TEST_CONFIG.TARGET_CONTACT.name,
          email: TEST_CONFIG.TARGET_CONTACT.email || prospect.email,
          businessName: prospect.businessName || TEST_CONFIG.TARGET_CONTACT.company || 'Quality Roofing & Mitigation',
        }
      : prospect;

    const firstName = activeProspect.contactName ? activeProspect.contactName.split(' ')[0] : 'Robert';

    console.log(`\n🧠 AI is crafting a draft campaign for ${activeProspect.businessName} (Contact: ${activeProspect.contactName}) using template "${templateNiche}"...`);

    const replaceTokens = (text: string) => {
      return text
        .replace(/{businessName}/g, activeProspect.businessName)
        .replace(/{contactName}/g, activeProspect.contactName)
        .replace(/{firstName}/g, firstName);
    };

    if (customTemplate) {
      const subject = replaceTokens(customTemplate.subject_template);
      if (customTemplate.is_static === 1) {
        const body = replaceTokens(customTemplate.body_prompt);
        return { subject, body };
      }
      
      let systemPrompt = customTemplate.body_prompt;
      const userPrompt = `Prospect Details:
- Contact Name: ${activeProspect.contactName} (Address as ${firstName})
- Business Name: ${activeProspect.businessName}
- Industry/Notes: ${activeProspect.notes || 'Property Restoration & Emergency Mitigation'}

Write only the body of the email starting directly after the greeting ("Hi ${firstName},"). Do not include a subject line or sign-off block.`;

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
        emailBodyText = `When emergency calls come in after hours while your crews are on-site, unanswered calls go straight to competitors. Our 24/7 AI emergency dispatch agent qualifies caller details instantly and alerts your team without delay.`;
      }

      const body = `Hi ${firstName},\n\n${emailBodyText}\n\nBest regards,\n\n${TEST_CONFIG.SENDER_SIGNATURE}`;
      return { subject, body };
    }

    let systemPrompt = "";
    let subject = "";

    const nicheLower = templateNiche.toLowerCase().trim();

    if (nicheLower === 'roofing') {
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Syncro Scale. 
Your agency builds 24/7 AI intake and lead-qualification agents specifically for commercial roofing and storm mitigation contractors.
Write a short, direct, and completely hype-free Day 1 cold outreach email tailored for roofing and mitigation managers.
- Keep it strictly under 4 sentences in a professional, direct B2B peer-to-peer tone.
- Avoid pushy sales jargon, corporate buzzwords, or fake compliments.
- Focus on the key operational pain point: when severe weather hits, inbound calls flood in. If calls hit voicemail, property owners immediately move to the next contractor on Google.
- Highlight how a 24/7 AI emergency intake agent answers instantly, gathers leak/damage parameters, and books inspections or dispatches teams on the spot.
- Prioritize a clear call-to-action asking if they are open to a brief 10-minute preview of the dispatch workflow this week.`;
      subject = `Roofing & mitigation dispatch for ${activeProspect.businessName}`;
    } else if (nicheLower === 'property') {
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Syncro Scale. 
Your agency builds 24/7 AI intake and lead-qualification agents specifically for property management and maintenance operations.
Write a short, direct, and concise Day 1 cold outreach email tailored specifically for property restoration and mitigation managers.
- Keep it strictly under 4 sentences in a professional, direct, peer-to-peer B2B tone.
- Avoid pushy sales jargon, corporate buzzwords, or unearned praise.
- Focus on the exact operational pain point: handling tenant emergency maintenance and water/fire damage requests after hours is expensive and prone to missed dispatches.
- Mention how a 24/7 AI emergency maintenance intake agent handles calls, qualifies issue severity, and dispatches mitigation crews immediately.
- Prioritize a clear call-to-action asking if they have 10 minutes open this week to evaluate our automated dispatch workflow.`;
      subject = `Emergency maintenance dispatch - ${activeProspect.businessName}`;
    } else if (nicheLower === 'realestate') {
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Syncro Scale. 
Write a short, direct, and professional Day 1 cold outreach email.
- Keep it strictly under 4 sentences in a direct B2B tone.
- Avoid sales jargon or unearned praise.
- Focus on the exact pain point: high-intent buyers who hit voicemail when scheduling showings will immediately contact another listing agent.
- Mention how a 24/7 AI virtual tour assistant routes qualified showing requests instantly.
- Prioritize a clear call-to-action asking if they are open to a quick 10-minute call this week.`;
      subject = `Showing workflow question - ${activeProspect.businessName}`;
    } else {
      // default: mitigation / restoration
      systemPrompt = `You are an expert B2B outbound copywriter writing a personal note on behalf of Ashley from Syncro Scale. 
Your agency builds 24/7 AI intake and emergency dispatch agents specifically for property restoration and mitigation managers.
Write a short, direct, and concise Day 1 cold outreach email tailored specifically for property restoration and mitigation managers.
- Keep it strictly under 4 sentences in a professional, direct, peer-to-peer B2B tone.
- Avoid pushy sales jargon, marketing fluff, or unearned praise.
- Focus heavily on the exact operational pain point: when mitigation crews are out on a job, incoming high-value water/fire emergency calls go to voicemail, losing $10k+ mitigation contracts to local competitors.
- Highlight how a 24/7 AI intake agent qualifies emergency leads and dispatches crews immediately so no job is lost.
- Prioritize a clear call-to-action asking if they are open to a quick 10-minute call this week to see how the automated dispatch pipeline works.`;
      subject = `Emergency mitigation dispatch - ${activeProspect.businessName}`;
    }

    const userPrompt = `Prospect Details:
- Contact Name: ${activeProspect.contactName} (Address as ${firstName})
- Business Name: ${activeProspect.businessName}
- Industry/Notes: ${activeProspect.notes || 'Property Restoration & Emergency Mitigation'}

Write only the body of the email starting directly after the greeting ("Hi ${firstName},"). Do not include a subject line or sign-off block.`;

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
      // Strip any accidental leading greeting generated by LLM
      emailBodyText = emailBodyText.replace(/^(hi|hello|dear)\s+[a-z0-9._\s-]+,?\s*/i, '');
    } catch (aiError) {
      console.error('⚠️ OpenAI generation failed, falling back to core baseline copy:', aiError);
      emailBodyText = `When crews are in the field, incoming emergency calls often go straight to voicemail—letting competitors grab those high-value mitigation jobs. Our 24/7 AI intake agent qualifies damage details instantly and dispatches your team without delay.`;
    }

    const body = `Hi ${firstName},\n\n${emailBodyText}\n\nBest regards,\n\n${TEST_CONFIG.SENDER_SIGNATURE}`;

    return { subject, body };
  }

  async generateCampaignSequence(
    clientId: string = 'default',
    prospect: Prospect
  ): Promise<CampaignResult> {
    const draft = await this.generateSequenceDraft(prospect);
    const targetRecipient = TEST_CONFIG.TEST_MODE
      ? (process.env.TEST_TARGET_EMAIL || TEST_CONFIG.TARGET_CONTACT.email || 'RBUTLER@qualityroofinglv.com')
      : prospect.email;

    await sendOutboundEmail(clientId, {
      to: targetRecipient,
      subject: draft.subject,
      htmlContent: draft.body.replace(/\n/g, '<br>'),
      textContent: draft.body
    });

    return {
      day1Email: draft.body,
      subject: draft.subject,
      recipient: targetRecipient
    };
  }
}

export async function sendOutboundEmail(
  clientId: string, 
  payload: { to: string; subject: string; htmlContent: string; textContent?: string }
) {
  try {
    const targetEmail = TEST_CONFIG.TEST_MODE
      ? (process.env.TEST_TARGET_EMAIL || TEST_CONFIG.TARGET_CONTACT.email || 'RBUTLER@qualityroofinglv.com')
      : payload.to;

    console.log(`🚀 [Outbound Sequence Engine] Dispatching email to: ${targetEmail}`);

    const result = await dispatchEmail({
      to: targetEmail,
      subject: payload.subject,
      html: payload.htmlContent,
      text: payload.textContent
    });

    if (!result.success) {
      console.error('❌ Email dispatch engine failed:', result.error);
      return { success: false, error: result.error };
    }

    console.log(`🚀 Dispatch successful via [${result.provider?.toUpperCase()}]! Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId, provider: result.provider };
  } catch (error) {
    console.error('❌ Network execution failure during email transit:', error);
    return { success: false, error };
  }
}