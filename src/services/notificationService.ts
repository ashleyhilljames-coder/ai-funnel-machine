import { LeadGuard } from '../outbound/leadGuard.js';
import { dispatchEmail } from './emailService.js';

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

const DEFAULT_TO_EMAIL = process.env.TEST_TARGET_EMAIL || 'RBUTLER@qualityroofinglv.com';

/**
 * Dispatches an internal emergency intake alert email to the team/admin.
 */
export async function sendEmailAlert(clientId: string, lead: NotificationLead): Promise<void> {
  const targetEmail = process.env.TEST_TARGET_EMAIL || DEFAULT_TO_EMAIL;
  const channel = lead.channel || 'Web Form';
  const clientName = lead.clientName || 'Syncro Scale Restoration';

  const html = `
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
  `;

  const result = await dispatchEmail({
    to: targetEmail,
    subject: `🚨 Emergency Mitigation Intake Alert [${clientName}]: ${lead.name}`,
    html
  });

  if (result.success) {
    console.log(`📧 [Notification Service] Admin email alert successfully routed to: ${targetEmail}`);
  }
}

/**
 * Dispatches an outbound Email dispatch confirmation to the lead (replacing legacy SMS dispatch).
 */
export async function sendEmailConfirmation(clientId: string, lead: NotificationLead): Promise<void> {
  const targetEmail = process.env.TEST_TARGET_EMAIL || lead.email || DEFAULT_TO_EMAIL;
  const clientName = lead.clientName || 'Syncro Scale Restoration';
  
  const recipientName = (process.env.TEST_TARGET_NAME && targetEmail === process.env.TEST_TARGET_EMAIL)
    ? process.env.TEST_TARGET_NAME.split(' ')[0]
    : (lead.name ? lead.name.split(' ')[0] : 'Valued Client');

  const html = `
    <div style="font-family: sans-serif; background-color: #ffffff; color: #1f2937; padding: 24px; border-radius: 8px; max-width: 580px; border: 1px solid #e5e7eb;">
      <h3 style="color: #111827; margin-top: 0;">Dispatch Confirmation — ${clientName}</h3>
      <p>Hello ${recipientName},</p>
      <p>Thank you for contacting <strong>${clientName}</strong>. We have received your emergency service dispatch request for <strong>${lead.damageType}</strong> mitigation at <strong>${lead.address}</strong>.</p>
      <p>Our mitigation team has been notified and a service specialist is being dispatched to your location immediately.</p>
      <p style="margin-top: 24px; font-size: 0.9rem; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 16px;">
        For urgent updates regarding your dispatch, reply directly to this email or call our 24/7 hotline.
      </p>
    </div>
  `;

  const result = await dispatchEmail({
    to: targetEmail,
    subject: `Emergency Service Dispatch Confirmation - ${clientName}`,
    html
  });

  if (result.success) {
    console.log(`💬 [Notification Service] Email dispatch confirmation sent to ${targetEmail}.`);
  }
}

/**
 * Legacy wrapper for backwards compatibility: routes SMS confirmation calls to email dispatch service.
 */
export async function sendSMSConfirmation(clientId: string, lead: NotificationLead): Promise<void> {
  console.log(`🔄 [Notification Service] Redirecting legacy SMS confirmation request to Email dispatch service...`);
  return sendEmailConfirmation(clientId, lead);
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
 * Transmits a lead alert email to the client's configured notification address (replacing legacy client SMS alert).
 */
export async function sendClientEmailAlert(clientId: string, lead: NotificationLead, alertEmail: string, clientName: string): Promise<void> {
  const targetEmail = process.env.TEST_TARGET_EMAIL || alertEmail || DEFAULT_TO_EMAIL;
  if (!targetEmail) return;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h3 style="color: #dc2626;">🚨 Lead Alert for ${clientName}</h3>
      <p>A new emergency lead has been qualified and dispatched:</p>
      <ul>
        <li><strong>Name:</strong> ${lead.name}</li>
        <li><strong>Phone:</strong> ${lead.phone}</li>
        <li><strong>Email:</strong> ${lead.email}</li>
        <li><strong>Address:</strong> ${lead.address}</li>
        <li><strong>Issue:</strong> ${lead.damageType}</li>
        <li><strong>Source:</strong> ${lead.channel || 'Web Form'}</li>
      </ul>
    </div>
  `;

  await dispatchEmail({
    to: targetEmail,
    subject: `🚨 [Syncro Scale Lead Alert] New Qualified Emergency Lead: ${lead.name}`,
    html
  });
}

/**
 * Legacy wrapper for client SMS alerts: routes to client Email alert.
 */
export async function sendClientSMSAlert(clientId: string, lead: NotificationLead, alertPhone: string, clientName: string): Promise<void> {
  console.log(`📱 [Notification Service] Converting client SMS alert for ${alertPhone} to Email dispatch alert...`);
  return sendClientEmailAlert(clientId, lead, process.env.TEST_TARGET_EMAIL || DEFAULT_TO_EMAIL, clientName);
}

/**
 * Unified dispatch orchestrator running email notification triggers concurrently.
 */
export async function triggerLeadNotifications(clientId: string, lead: NotificationLead): Promise<void> {
  console.log(`🌀 [Notification Service] Triggering lead ingestion email notifications for ${lead.name} (Client: ${clientId})...`);
  
  const settings = leadGuard.getClientSettings(clientId);
  const clientName = settings?.name || lead.clientName || 'Syncro Scale Restoration';
  lead.clientName = clientName;

  const promises: Promise<any>[] = [
    sendEmailAlert(clientId, lead),
    sendEmailConfirmation(clientId, lead)
  ];

  const notifyOnLead = settings ? settings.notifyOnLead : 1;
  if (notifyOnLead === 1) {
    if (settings?.slackWebhookUrl) {
      promises.push(sendSlackWebhook(clientId, lead, settings.slackWebhookUrl, clientName));
    }
    if (settings?.notificationPhone) {
      promises.push(sendClientEmailAlert(clientId, lead, process.env.TEST_TARGET_EMAIL || DEFAULT_TO_EMAIL, clientName));
    }
  } else {
    console.log(`ℹ️ [Notification Service] Client notifications are disabled for "${clientId}"`);
  }

  await Promise.all(promises);
}
