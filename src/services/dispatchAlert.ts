// src/services/dispatchAlert.ts
import { CallRecord } from './db';

export async function triggerDispatchAlert(record: CallRecord): Promise<void> {
  console.log(`[Dispatch Service] Evaluating urgent alert for call ${record.conversationId}...`);

  const alertPayload = {
    title: '🚨 NEW PROPERTY DISPATCH REQUEST',
    callerPhone: record.callerPhone,
    duration: `${record.callDuration}s`,
    summary: record.summary,
    receivedAt: record.createdAt,
  };

  // Printable formatted notification for console / Webhook relay
  console.log('--------------------------------------------------');
  console.log(`${alertPayload.title}`);
  console.log(`Caller: ${alertPayload.callerPhone}`);
  console.log(`Received: ${alertPayload.receivedAt}`);
  console.log(`Summary: ${alertPayload.summary}`);
  console.log('--------------------------------------------------');

  // Trigger downstream webhooks / Twilio SMS / SendGrid Email if keys exist
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