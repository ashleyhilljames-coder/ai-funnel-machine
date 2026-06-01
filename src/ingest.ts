import { randomUUID } from 'crypto';
import { LeadSchema, type Lead } from './lead.js';
import { publish } from './pubsub.js';

export type IngestInput = Omit<Lead, 'id' | 'createdAt'>;

export async function ingestLead(input: IngestInput): Promise<{ messageId: string; lead: Lead }> {
  const lead = LeadSchema.parse({
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  });

  const messageId = await publish(lead);
  return { messageId, lead };
}
