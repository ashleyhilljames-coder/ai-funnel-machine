import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../config.js';
import type { Lead } from '../lead.js';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export const QualificationResultSchema = z.object({
  qualified: z.boolean(),
  score: z.number().int().min(0).max(100),
  reason: z.string(),
});

export type QualificationResult = z.infer<typeof QualificationResultSchema>;

const SYSTEM_PROMPT = `You are a B2B lead qualification agent for a sales funnel.
Evaluate incoming leads and return a structured qualification result.
Score leads 0–100 based on: completeness of contact info, presence of a company, and funnel step.
A lead is qualified if score >= 60.`;

export async function QualifierAgent(lead: Lead): Promise<QualificationResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'qualify_lead',
        description: 'Return the qualification result for a lead',
        input_schema: {
          type: 'object' as const,
          properties: {
            qualified: { type: 'boolean' },
            score: { type: 'integer', minimum: 0, maximum: 100 },
            reason: { type: 'string' },
          },
          required: ['qualified', 'score', 'reason'],
        },
      },
    ],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: `Qualify this lead:\n${JSON.stringify(lead, null, 2)}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('QualifierAgent: no tool_use block in response');
  }

  return QualificationResultSchema.parse(toolUse.input);
}
