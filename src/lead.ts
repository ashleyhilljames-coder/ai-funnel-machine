import { z } from 'zod';

export const LeadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().min(1),
  funnelStep: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type Lead = z.infer<typeof LeadSchema>;
