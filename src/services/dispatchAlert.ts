// src/services/dispatchAlert.ts
import { CallRecord } from './db';
import { dispatchEmail } from './emailService';

export async function triggerDispatchAlert(record: CallRecord): Promise<void> {
  console.log(`[Dispatch Service] Evaluating urgent alert for call ${record.conversationId}...`);

  const alertPayload = {
    title: '🚨 NEW PROPERTY DISPATCH REQUEST',
    callerPhone: record.callerPhone,
    duration: `${record.callDuration}s`,
    summary: record.summary,
    receivedAt: record.createdAt,
  };

  // Printable formatted notification for console
  console.log('--------------------------------------------------');
  console.log(`${alertPayload.title}`);
  console.log(`Caller: ${alertPayload.callerPhone}`);
  console.log(`Received: ${alertPayload.receivedAt}`);
  console.log(`Summary: ${alertPayload.summary}`);
  console.log('--------------------------------------------------');

  const targetEmail = process.env.TEST_TARGET_EMAIL || 'RBUTLER@qualityroofinglv.com';

  // 1. Dispatch Email Alert
  try {
    await dispatchEmail({
      to: targetEmail,
      subject: `🚨 Urgent Emergency Property Dispatch Alert - ${record.callerPhone}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #dc2626; margin-top: 0;">🚨 Urgent Property Dispatch Request</h2>
          <p><strong>Caller Phone:</strong> ${alertPayload.callerPhone}</p>
          <p><strong>Call Duration:</strong> ${alertPayload.duration}</p>
          <p><strong>Time Received:</strong> ${alertPayload.receivedAt}</p>
          <p><strong>Summary:</strong></p>
          <blockquote style="background-color: #f9fafb; padding: 12px; border-left: 4px solid #dc2626; margin: 0;">
            ${alertPayload.summary}
          </blockquote>
        </div>
      `
    });
    console.log(`[Dispatch Service] Alert email routed directly to target test email: ${targetEmail}`);
  } catch (emailErr) {
    console.error('[Dispatch Service Error] Failed to send email alert:', emailErr);
  }

  // 2. Trigger downstream webhooks if keys exist
  if (process.env.DISPATCH_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISPATCH_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      });
      console.log('[Dispatch Service] Alert pushed to DISPATCH_WEBHOOK_URL');
    } catch (err) {
      console.error('[Dispatch Service Error] Failed to send dispatch alert webhook:', err);
    }
  }
}