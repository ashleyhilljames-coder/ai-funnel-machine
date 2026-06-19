import { LeadGuard } from './src/outbound/leadGuard';

console.log('🏁 Starting Voice Agent Settings Verification Tests...');

// 1. Set up the prototype mock override before importing/requiring index_new
let mockSettings: any = null;
const originalGetClientSettings = LeadGuard.prototype.getClientSettings;

LeadGuard.prototype.getClientSettings = function (clientId: string) {
  if (clientId === 'test_voice_client_mock') {
    return mockSettings;
  }
  return originalGetClientSettings.call(this, clientId);
};

// Set NODE_ENV to prevent index_new from starting the HTTP server
process.env.NODE_ENV = 'test';

// Use require() to import the helper functions from index_new after registering the mock
// This avoids ESM hoisting executing index_new before the prototype mock is registered
const { getVoiceAgentVoice, getVoiceAgentInstructions } = require('./src/index_new');

async function runTests() {
  // --- Test Case 1: Real Database Persistence ---
  console.log('\n--- Test Case 1: Verifying SQLite database read/write ---');
  const leadGuard = new LeadGuard();
  const testClientId = 'test_voice_client_db';

  const testSettings = {
    name: 'Voice DB Test Client',
    niche: 'emergency mitigation',
    greeting: 'Welcome to the DB test.',
    chatGreeting: 'Hello DB chat.',
    voiceTone: 'onyx',
    voiceInstructions: 'You are Onyx Agent, speak deeply and concisely.',
    updatedAt: new Date().toISOString()
  };

  console.log(`Saving voice settings to database for "${testClientId}"...`);
  leadGuard.saveClientSettings(testClientId, testSettings);

  const retrieved = leadGuard.getClientSettings(testClientId);
  if (!retrieved) {
    throw new Error('Failed to retrieve settings from SQLite db');
  }

  console.log(`Retrieved voiceTone: "${retrieved.voiceTone}" (expected "onyx")`);
  console.log(`Retrieved voiceInstructions: "${retrieved.voiceInstructions}" (expected "You are Onyx Agent...")`);

  if (retrieved.voiceTone !== 'onyx') {
    throw new Error(`Database voiceTone mismatch: expected "onyx", got "${retrieved.voiceTone}"`);
  }
  if (retrieved.voiceInstructions !== 'You are Onyx Agent, speak deeply and concisely.') {
    throw new Error(`Database voiceInstructions mismatch`);
  }
  console.log('✅ SQLite database persistence verified successfully.');

  // --- Test Case 2: Custom Override Resolution (Mocked) ---
  console.log('\n--- Test Case 2: Custom Tone & Prompt Override Resolution ---');
  mockSettings = {
    name: 'Voice Mock Test Client',
    niche: 'water mitigation',
    voiceTone: 'shimmer',
    voiceInstructions: 'Override Prompt: Speak with enthusiasm.'
  };

  const toneResolved = getVoiceAgentVoice('test_voice_client_mock');
  const instructionsResolved = getVoiceAgentInstructions('test_voice_client_mock');

  console.log(`Resolved voice: "${toneResolved}" (expected "shimmer")`);
  console.log(`Resolved instructions: "${instructionsResolved}" (expected "Override Prompt: Speak with enthusiasm.")`);

  if (toneResolved !== 'shimmer') {
    throw new Error(`Mocked voiceTone resolution failed: got "${toneResolved}"`);
  }
  if (instructionsResolved !== 'Override Prompt: Speak with enthusiasm.') {
    throw new Error(`Mocked voiceInstructions resolution failed: got "${instructionsResolved}"`);
  }
  console.log('✅ Custom voice tone and instructions override resolved correctly.');

  // --- Test Case 3: Default Tone Resolution ---
  console.log('\n--- Test Case 3: Default Tone Resolution (Fallback) ---');
  mockSettings = {
    name: 'Voice Mock Test Client',
    niche: 'water mitigation',
    voiceTone: '', // Empty tone
    voiceInstructions: 'Prompt override exists.'
  };

  const fallbackTone = getVoiceAgentVoice('test_voice_client_mock');
  console.log(`Resolved voice for empty tone settings: "${fallbackTone}" (expected "alloy")`);
  if (fallbackTone !== 'alloy') {
    throw new Error(`Mocked voiceTone default fallback failed: got "${fallbackTone}"`);
  }
  console.log('✅ Default tone fallback verified successfully.');

  // --- Test Case 4: Default Niche Prompt Fallback ---
  console.log('\n--- Test Case 4: Default Niche Prompt Fallback ---');
  mockSettings = null; // No database record, should fall back to default niche logic

  // Test realestate_nexus fallback
  const realestateInstructions = getVoiceAgentInstructions('realestate_nexus');
  console.log(`realestate_nexus fallback instructions length: ${realestateInstructions.length} characters`);
  if (!realestateInstructions.includes('real estate booking assistant') || !realestateInstructions.includes('append_lead')) {
    throw new Error(`realestate_nexus niche prompt fallback failed: ${realestateInstructions}`);
  }

  // Test default_client fallback
  const defaultClientInstructions = getVoiceAgentInstructions('default_client');
  console.log(`default_client fallback instructions length: ${defaultClientInstructions.length} characters`);
  if (!defaultClientInstructions.includes('smart automation voice consulting assistant') || !defaultClientInstructions.includes('append_lead')) {
    throw new Error(`default_client niche prompt fallback failed: ${defaultClientInstructions}`);
  }
  console.log('✅ Default niche prompt fallbacks verified successfully.');

  // --- Clean Up ---
  console.log('\n--- Cleaning up test records ---');
  // Delete the test client from SQLite database by inserting null / removing it
  // Since saveClientSettings upserts, we can just overwrite it with initial blank / defaults if we want, or leave it.
  // Let's delete the row directly to keep database clean
  (leadGuard as any).db.prepare("DELETE FROM client_settings WHERE client_id = ?").run(testClientId);
  console.log('Cleaned up SQLite database records.');

  console.log('\n🎉 ALL VOICE SETTINGS TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
