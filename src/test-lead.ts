import 'dotenv/config';
import { randomUUID } from 'crypto';
import { processLead } from './processor.js';
import type { Lead } from './lead.js';

const sampleLead: Lead = {
  id: randomUUID(),
  email: 'jane.doe@acmecorp.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '+1-555-0100',
  company: 'Acme Corp',
  source: 'landing-page',
  funnelStep: 'opt-in',
  metadata: { campaign: 'summer-launch', adVariant: 'B' },
  createdAt: new Date().toISOString(),
};

console.log('=== AI Funnel Machine — Test Lead ===\n');
console.log('Input lead:');
console.log(JSON.stringify(sampleLead, null, 2));
console.log('\n--- Running pipeline ---\n');

processLead(sampleLead)
  .then((result) => {
    console.log('\n--- Pipeline complete ---\n');
    console.log(`Outcome: ${result.outcome}`);
    console.log('\nQualification:');
    console.log(JSON.stringify(result.qualification, null, 2));
    if (result.evaluation) {
      console.log('\nEvaluation:');
      console.log(JSON.stringify(result.evaluation, null, 2));
    }
    if (result.booking) {
      console.log('\nBooking:');
      console.log(JSON.stringify(result.booking, null, 2));
    }
  })
  .catch((err) => {
    console.error('Pipeline error:', err);
    process.exit(1);
  });
