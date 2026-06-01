import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../config.js';
import type { Lead } from '../lead.js';
import type { QualificationResult } from './qualifier.js';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export const EvaluationResultSchema = z.object({
  brandFit: z.boolean(),
  confidence: z.number().min(0).max(1),
  notes: z.string(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

const SYSTEM_PROMPT = `You are a brand evaluation agent for a sales funnel.
Given a lead and its qualification result, assess whether the lead is a strong brand fit.
Consider: company presence, funnel step alignment, and metadata signals.
Return confidence as a float 0.0–1.0. Brand fit is true when confidence >= 0.65.`;

export async function EvaluatorAgent(
  lead: Lead,
  qualification: QualificationResult,
): Promise<EvaluationResult> {
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
        name: 'evaluate_brand_fit',
        description: 'Return the brand evaluation result for a lead',
        input_schema: {
          type: 'object' as const,
          properties: {
            brandFit: { type: 'boolean' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            notes: { type: 'string' },
          },
          required: ['brandFit', 'confidence', 'notes'],
        },
      },
    ],
    tool_choice: { type: 'auto' },
    messages: [
      {
        role: 'user',
        content: `Evaluate brand fit for this lead:\n${JSON.stringify({ lead, qualification }, null, 2)}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('EvaluatorAgent: no tool_use block in response');
  }

  return EvaluationResultSchema.parse(toolUse.input);
}
