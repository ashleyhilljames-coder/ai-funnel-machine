import 'dotenv/config';
import express from 'express';
import leadRoutes from './routes/leads';
import { supabaseAdmin } from './lib/supabase';
import http from 'http';

async function runVerification() {
  console.log('🧪 Starting verification for POST /api/leads/create...');

  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadRoutes);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3000;
  const baseUrl = `http://localhost:${port}`;

  let createdLeadId: number | null = null;

  try {
    // 1. Validation test: Missing homeowner_name
    console.log('Test 1: Testing missing homeowner_name payload...');
    const res1 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify({
        homeowner_phone: '555-0199',
        damage_type: 'Water',
      }),
    });
    const data1 = await res1.json();
    console.log(`Status: ${res1.status}, Response:`, data1);
    if (res1.status !== 400 || data1.success !== false) {
      throw new Error('Test 1 failed: Expected 400 status and success: false');
    }
    console.log('✅ Test 1 passed!');

    // 2. Validation test: Missing homeowner_phone
    console.log('\nTest 2: Testing missing homeowner_phone payload...');
    const res2 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify({
        homeowner_name: 'John Smith',
        damage_type: 'Fire',
      }),
    });
    const data2 = await res2.json();
    console.log(`Status: ${res2.status}, Response:`, data2);
    if (res2.status !== 400 || data2.success !== false) {
      throw new Error('Test 2 failed: Expected 400 status and success: false');
    }
    console.log('✅ Test 2 passed!');

    // 3. Successful lead creation test
    console.log('\nTest 3: Testing successful lead creation...');

    // Fetch existing plumber to supply plumber_id
    const { data: plumber } = await supabaseAdmin
      .from('plumbers')
      .select('id')
      .limit(1)
      .single();

    const testPayload = {
      homeowner_name: 'Verification Test Homeowner',
      homeowner_phone: '+15550199999',
      damage_type: 'Water',
      plumber_id: plumber?.id,
      notes: 'Emergency basement leak',
    };

    const res3 = await fetch(`${baseUrl}/api/leads/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify(testPayload),
    });

    const data3 = await res3.json();
    console.log(`Status: ${res3.status}, Response:`, data3);

    if (res3.status !== 201 || !data3.success || !data3.lead) {
      throw new Error(`Test 3 failed: Lead creation unsuccessful. Response: ${JSON.stringify(data3)}`);
    }

    if (data3.lead.status !== 'DISPATCHED') {
      throw new Error(`Test 3 failed: Expected status DISPATCHED but got ${data3.lead.status}`);
    }

    createdLeadId = data3.lead.id;
    console.log(`✅ Test 3 passed! Lead created with ID: ${createdLeadId}, status: ${data3.lead.status}`);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (createdLeadId) {
      console.log(`Cleaning up test lead ID ${createdLeadId} from Supabase...`);
      await supabaseAdmin.from('leads').delete().eq('id', createdLeadId);
      console.log('Cleanup complete.');
    }
    server.close();
  }
}

runVerification();
