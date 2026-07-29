import { z } from 'zod';

export const LeadSchema = z.object({
  id: z.string().uuid(),
  callSid: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().min(1).default('TELEPHONY_DISPATCH'),
  funnelStep: z.string().min(1).default('DISPATCH_INTAKE'),
  
  // Emergency Dispatch Intake Fields
  propertyAddress: z.string().optional(),
  emergencyIssue: z.string().optional(),
  severityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dispatchStatus: z.enum(['PENDING', 'DISPATCHED', 'RESOLVED']).default('PENDING'),

  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type Lead = z.infer<typeof LeadSchema>;