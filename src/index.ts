import 'dotenv/config';
import app from './server.js';
import { startSubscriber } from './subscriber.js';
import { processLead } from './processor.js';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`AI Funnel Machine listening on port ${PORT}`);
});

const closeSubscriber = startSubscriber(async (lead) => {
  const result = await processLead(lead);
  console.log(`[Processor] outcome=${result.outcome} leadId=${lead.id}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await closeSubscriber();
  process.exit(0);
});
