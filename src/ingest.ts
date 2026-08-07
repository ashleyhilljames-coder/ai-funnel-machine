import { randomUUID } from 'crypto';
import { LeadSchema, type Lead } from './lead.js';
import { publish } from './pubsub.js';

export type IngestInput = Omit<Lead, 'id' | 'createdAt'>;

export async function ingestLead(input: IngestInput) {
  const lead = LeadSchema.parse({
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  });

  let messageId: string | null = null;
  try {
    messageId = await publish(lead);
  } catch (err: any) {
    console.warn('⚠️ GCP PubSub publish skipped/failed:', err?.message || err);
  }

  return { messageId, lead };
}