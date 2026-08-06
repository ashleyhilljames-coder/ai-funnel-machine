import 'dotenv/config';
import express from 'express';
import leadRoutes from './routes/leads';
import http from 'http';

async function runSecurityTests() {
  console.log('🔒 Starting Security Integration Tests...\n');

  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/leads', leadRoutes);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3000;
  const baseUrl = `http://localhost:${port}`;

  const validApiKey = process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026';

  try {
    // Test 1: Request to /api/leads/create without x-api-key (Expect 401)
    console.log('Test 1: Request to /api/leads/create without x-api-key...');
    const res1 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeowner_name: 'No Key Test', homeowner_phone: '5551234' }),
    });
    const data1 = await res1.json();
    console.log(`Status: ${res1.status}, Response:`, data1);
    if (res1.status !== 401 || data1.success !== false || data1.error !== 'Unauthorized: Invalid or missing API key') {
      throw new Error(`Test 1 failed: Expected 401 Unauthorized, got status ${res1.status}`);
    }
    console.log('✅ Test 1 passed: Request without API key returned 401 Unauthorized.');

    // Test 2: Request with an invalid x-api-key (Expect 401)
    console.log('\nTest 2: Request to /api/leads/create with invalid x-api-key...');
    const res2 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'invalid-secret-key-12345',
      },
      body: JSON.stringify({ homeowner_name: 'Bad Key Test', homeowner_phone: '5551234' }),
    });
    const data2 = await res2.json();
    console.log(`Status: ${res2.status}, Response:`, data2);
    if (res2.status !== 401 || data2.success !== false || data2.error !== 'Unauthorized: Invalid or missing API key') {
      throw new Error(`Test 2 failed: Expected 401 Unauthorized, got status ${res2.status}`);
    }
    console.log('✅ Test 2 passed: Request with invalid API key returned 401 Unauthorized.');

    // Test 3: Request with valid x-api-key (Expect normal response / validation failure 400 for missing phone)
    console.log('\nTest 3: Request to /api/leads/create with valid x-api-key...');
    const res3 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': validApiKey,
      },
      body: JSON.stringify({ homeowner_name: ' Valid Key Test ' }),
    });
    const data3 = await res3.json();
    console.log(`Status: ${res3.status}, Response:`, data3);
    if (res3.status === 401) {
      throw new Error('Test 3 failed: Request with valid API key was rejected with 401');
    }
    if (res3.status !== 400 || data3.error !== 'homeowner_phone is required') {
      throw new Error(`Test 3 failed: Expected 400 validation error for missing phone, got ${res3.status}`);
    }
    console.log('✅ Test 3 passed: Request with valid API key passed auth middleware successfully.');

    // Test 4: GET /health returns 200 OK without requiring x-api-key
    console.log('\nTest 4: GET /health uptime endpoint...');
    const res4 = await fetch(`${baseUrl}/health`);
    const data4 = await res4.json();
    console.log(`Status: ${res4.status}, Response:`, data4);
    if (res4.status !== 200 || data4.status !== 'ok' || !data4.timestamp) {
      throw new Error(`Test 4 failed: Expected 200 OK from /health, got ${res4.status}`);
    }
    console.log('✅ Test 4 passed: GET /health returned 200 OK with timestamp.');

    console.log('\n🎉 ALL SECURITY TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Security integration test failed:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runSecurityTests();
