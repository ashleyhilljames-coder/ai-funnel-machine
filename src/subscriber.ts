import { PubSub, type Message } from '@google-cloud/pubsub';
import { config } from './config.js';
import { LeadSchema, type Lead } from './lead.js';

export type LeadHandler = (lead: Lead) => Promise<void>;

function parseLead(message: Message): Lead | null {
  try {
    const data = JSON.parse(message.data.toString()) as unknown;
    return LeadSchema.parse(data);
  } catch (err) {
    console.error('Failed to parse lead message', { messageId: message.id, err });
    return null;
  }
}

export function startSubscriber(handler: LeadHandler): () => Promise<void> {
  const client = new PubSub({ projectId: config.GOOGLE_CLOUD_PROJECT });
  const subscription = client.subscription(config.PUBSUB_SUBSCRIPTION);

  subscription.on('message', async (message: Message) => {
    const lead = parseLead(message);

    if (!lead) {
      message.ack();
      return;
    }

    try {
      await handler(lead);
      message.ack();
    } catch (err) {
      console.error('Handler failed, nacking message', { leadId: lead.id, err });
      message.nack();
    }
  });

  subscription.on('error', (err) => {
    console.error('Subscription error', err);
  });

  console.log(`Subscribed to ${config.PUBSUB_SUBSCRIPTION}`);

  return () => subscription.close();
}
