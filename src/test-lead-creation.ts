import { toE164Phone } from './routes/leads';

function testLeadCreationLogic() {
  console.log('🧪 Testing Twilio E.164 Phone Formatting & Lead Processing...');

  const testCases = [
    { input: '(555) 345-6789', expected: '+15553456789' },
    { input: '555-345-6789', expected: '+15553456789' },
    { input: '15553456789', expected: '+15553456789' },
    { input: '+15553456789', expected: '+15553456789' },
  ];

  let passed = true;
  for (const tc of testCases) {
    const res = toE164Phone(tc.input);
    if (res === tc.expected) {
      console.log(`  ✓ toE164Phone("${tc.input}") => "${res}"`);
    } else {
      console.error(`  ✗ toE164Phone("${tc.input}") => "${res}" (Expected: "${tc.expected}")`);
      passed = false;
    }
  }

  const sampleLead = {
    fullName: 'Rapid Home Owner',
    phone: toE164Phone('(800) 727-4373'),
    email: 'homeowner@rapidhomerelief.com',
    address: '100 Emergency Way, Suite 400',
    emergencyType: 'Water / Flood Damage',
    waterSource: 'Burst Pipe',
    affectedRooms: '2-3 Rooms',
    description: 'Basement flooded, emergency crew requested immediately',
  };

  console.log('\n📋 Sample Formulated Lead Payload for Express & Twilio:');
  console.log(JSON.stringify(sampleLead, null, 2));

  if (passed && sampleLead.phone === '+18007274373') {
    console.log('\n✅ All lead validation & Twilio E.164 phone formatting tests PASSED!');
  } else {
    console.error('\n❌ Lead formatting test failed');
    process.exit(1);
  }
}

testLeadCreationLogic();
