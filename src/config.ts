import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  PUBSUB_TOPIC: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
