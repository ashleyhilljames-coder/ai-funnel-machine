import { appendLeadToSheet } from './src/services/sheetsService';

async function runTest() {
  console.log('🚀 Attempting to connect to Google Sheets...');
  
  const mockLead = {
    name: 'Test Ashley Live Pipeline',
    phone: '702-555-0199',
    email: 'test@agenticnexus.vip',
    address: '123 Automation Way, Las Vegas, NV',
    damageType: 'Testing our custom backend connection directly from VS Code terminal!'
  };

  try {
    const success = await appendLeadToSheet(mockLead);
    if (success) {
      console.log('🎉 VICTORY! Go check your Google Sheet right now!');
    }
  } catch (error) {
    console.error('💥 Test failed. Check your credential file path or permissions.');
  }
}

runTest();