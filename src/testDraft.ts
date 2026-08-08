import { OutboundProcessor } from './outbound/processor';

async function testDraft() {
  const processor = new OutboundProcessor();

  console.log('🤖 Generating sample sequence draft...');
  
  const draft = await processor.generateLeadDraft(
    {
      businessName: 'Sin City Water Mitigation',
      contactName: 'Alex',
      email: 'test@example.com',
      niche: 'water damage mitigation'
    },
    'mitigation'
  );

  console.log('\n--- 📧 GENERATED DRAFT ---');
  console.log('Subject:', draft.subject);
  console.log('Body:\n', draft.body);
  console.log('---------------------------\n');
}

testDraft();