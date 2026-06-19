import { Resend } from 'resend';
import twilio from 'twilio';
import { LeadGuard } from '../outbound/leadGuard.js';

const leadGuard = new LeadGuard();

export interface NotificationLead {
  name: string;
  phone: string;
  email: string;
  address: string;
  damageType: string;
  channel?: 'Phone Call' | 'Web Form' | 'Facebook Lead Ads' | string;
  clientName?: string;
}

const DEFAULT_TO_EMAIL = 'ashley.hilljames@gmail.com'; // Admin notification target

/**
 * Dispatches an email notification to the team using Resend.
 */
export async function sendEmailAlert(clientId: string, lead: NotificationLead): Promise<void> {
  const settings = leadGuard.getClientSettings(clientId);
  const apiKey = (settings && settings.resendApiKey) ? settings.resendApiKey : process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [Notification Service] Resend Email skipped: RESEND_API_KEY is missing');
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const channel = lead.channel || 'Web Form';

    const clientName = lead.clientName || 'Syncro Scale Restoration';
    const response = await resend.emails.send({
      from: 'Syncro Scale Ingestion <onboarding@resend.dev>',
      to: DEFAULT_TO_EMAIL,
      subject: `🚨 Emergency Mitigation Intake Alert [${clientName}]: ${lead.name}`,
      html: `
        <div style="font-family: sans-serif; background-color: #0b0d10; color: #f3f4f6; padding: 30px; border-radius: 12px; max-width: 600px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="color: #f97316; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 15px; margin-top: 0;">New Inbound Emergency Lead for ${clientName}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600; width: 150px;">Ingestion Source:</td>
              <td style="padding: 8px 0; color: #f3f4f6; font-weight: bold;">${channel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Customer Name:</td>
              <td style="padding: 8px 0; color: #f3f4f6;">${lead.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Phone Number:</td>
              <td style="padding: 8px 0; color: #f3f4f6;"><a href="tel:${lead.phone}" style="color: #3b82f6; text-decoration: none;">${lead.phone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Email Address:</td>
              <td style="padding: 8px 0; color: #f3f4f6;"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none;">${lead.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Property Address:</td>
              <td style="padding: 8px 0; color: #f3f4f6;">${lead.address}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Damage Type:</td>
              <td style="padding: 8px 0; color: #f97316; font-weight: bold;">${lead.damageType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Time Captured:</td>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 0.9rem;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.8rem; color: #9ca3af; text-align: center;">
            Syncro Scale Clean Stack Automation Engine
          </div>
        </div>
      `
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log(`📧 [Notification Service] Email dispatch successful for lead: ${lead.name}`);
  } catch (error: any) {
    console.error(`❌ [Notification Service] Failed to send email alert:`, error.message);
  }
}

/**
 * Dispatches an outbound SMS confirmation to the lead using Twilio.
 */
export async function sendSMSConfirmation(clientId: string, lead: NotificationLead): Promise<void> {
  const settings = leadGuard.getClientSettings(clientId);
  const accountSid = (settings && settings.twilioAccountSid) ? settings.twilioAccountSid : process.env.TWILIO_ACCOUNT_SID;
  const authToken = (settings && settings.twilioAuthToken) ? settings.twilioAuthToken : process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = (settings && settings.twilioPhoneNumber) ? settings.twilioPhoneNumber : process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    console.warn('⚠️ [Notification Service] Twilio SMS skipped: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER is missing');
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    
    const clientName = lead.clientName || 'Syncro Scale Restoration';
    // Construct reassuring, premium copy for the emergency confirmation SMS
    const messageBody = `Hello ${lead.name}, thank you for contacting ${clientName}. We have received your emergency request for ${lead.damageType} mitigation at ${lead.address}. A service specialist is being dispatched and will contact you shortly.`;

    const message = await client.messages.create({
      body: messageBody,
      from: fromPhone,
      to: lead.phone
    });

    console.log(`💬 [Notification Service] Twilio SMS dispatch successful to ${lead.phone}. SID: ${message.sid}`);
  } catch (error: any) {
    console.error(`❌ [Notification Service] Failed to send Twilio SMS:`, error.message);
  }
}

/**
 * Compiles a Slack Block Kit payload containing structured fields and POSTs it to the Slack incoming webhook.
 */
export async function sendSlackWebhook(clientId: string, lead: NotificationLead, webhookUrl: string, clientName: string): Promise<void> {
  if (!webhookUrl) return;
  try {
    const channel = lead.channel || 'Web Form';
    const payload = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 New Qualified Lead Alert!",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Client:* ${clientName} (${clientId})\n*Niche:* ${lead.damageType || "General Restoration"}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Name:*\n${lead.name}`
            },
            {
              type: "mrkdwn",
              text: `*Phone:*\n${lead.phone}`
            },
            {
              type: "mrkdwn",
              text: `*Email:*\n${lead.email}`
            },
            {
              type: "mrkdwn",
              text: `*Address:*\n${lead.address}`
            },
            {
              type: "mrkdwn",
              text: `*Source:*\n${channel}`
            },
            {
              type: "mrkdwn",
              text: `*Details/Damage:*\n${lead.damageType}`
            }
          ]
        },
        {
          type: "divider"
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 *Captured At:* ${new Date().toLocaleString()} | _Syncro Scale Clean Stack Automation_`
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API responded with status ${response.status}`);
    }

    console.log(`💚 [Slack Webhook] Notification sent successfully for client "${clientId}"`);
  } catch (error: any) {
    console.error(`❌ [Slack Webhook] Failed to dispatch webhook for client "${clientId}":`, error.message);
  }
}

/**
 * Transmits a lead alert text message to the client's configured notification phone.
 */
export async function sendClientSMSAlert(clientId: string, lead: NotificationLead, alertPhone: string, clientName: string): Promise<void> {
  if (!alertPhone) return;
  const settings = leadGuard.getClientSettings(clientId);
  const accountSid = (settings && settings.twilioAccountSid) ? settings.twilioAccountSid : process.env.TWILIO_ACCOUNT_SID;
  const authToken = (settings && settings.twilioAuthToken) ? settings.twilioAuthToken : process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = (settings && settings.twilioPhoneNumber) ? settings.twilioPhoneNumber : process.env.TWILIO_PHONE_NUMBER;

  const body = `🚨 [Syncro Scale Lead Alert] New lead qualified for ${clientName}: Name: ${lead.name}, Phone: ${lead.phone}, Email: ${lead.email}, Address: ${lead.address}, Issue: ${lead.damageType}. Source: ${lead.channel || 'Web Form'}`;

  if (!accountSid || !authToken || !fromPhone) {
    // Graceful fallback to sandbox console logging
    console.log(`📱 [SANDBOX SMS ALERT] To: ${alertPhone} | Message: ${body}`);
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body,
      from: fromPhone,
      to: alertPhone
    });
    console.log(`💬 [Notification Service] Client Twilio SMS alert sent successfully to ${alertPhone}. SID: ${message.sid}`);
  } catch (error: any) {
    console.error(`❌ [Notification Service] Failed to send Client Twilio SMS alert:`, error.message);
    // Log as fallback anyway so the developer sees the message
    console.log(`📱 [SANDBOX SMS ALERT FALLBACK] To: ${alertPhone} | Message: ${body}`);
  }
}

/**
 * Unified dispatch orchestrator running email and SMS triggers concurrently.
 */
export async function triggerLeadNotifications(clientId: string, lead: NotificationLead): Promise<void> {
  console.log(`🌀 [Notification Service] Triggering lead ingestion notifications for ${lead.name} (Client: ${clientId})...`);
  
  const settings = leadGuard.getClientSettings(clientId);
  const clientName = settings?.name || lead.clientName || 'Syncro Scale Restoration';
  lead.clientName = clientName;

  const promises: Promise<any>[] = [
    sendEmailAlert(clientId, lead),
    sendSMSConfirmation(clientId, lead)
  ];

  const notifyOnLead = settings ? settings.notifyOnLead : 1;
  if (notifyOnLead === 1) {
    if (settings?.slackWebhookUrl) {
      promises.push(sendSlackWebhook(clientId, lead, settings.slackWebhookUrl, clientName));
    }
    if (settings?.notificationPhone) {
      promises.push(sendClientSMSAlert(clientId, lead, settings.notificationPhone, clientName));
    }
  } else {
    console.log(`ℹ️ [Notification Service] Client notifications are disabled for "${clientId}"`);
  }

  await Promise.all(promises);
}
