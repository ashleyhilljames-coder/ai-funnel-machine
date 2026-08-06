import 'dotenv/config';
import express from 'express';
import leadRoutes from './routes/leads';
import { supabaseAdmin } from './lib/supabase';
import http from 'http';

async function runUpdateVerification() {
  console.log('🧪 Starting verification for POST /api/leads/update-status...');

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
    // 1. Validation test: Missing lead_id or status
    console.log('Test 1: Testing missing payload fields validation...');
    const res1 = await fetch(`${baseUrl}/api/leads/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify({ status: 'SIGNED' }),
    });
    const data1 = await res1.json();
    if (res1.status !== 400 || data1.success !== false) {
      throw new Error('Test 1 failed: Expected 400 status for missing lead_id');
    }
    console.log('✅ Test 1 passed!');

    // 2. Setup: Get a plumber and insert a test lead into Supabase
    console.log('\nTest 2: Inserting initial test lead with status DISPATCHED...');
    const { data: plumber, error: plumberErr } = await supabaseAdmin
      .from('plumbers')
      .select('id')
      .limit(1)
      .single();

    if (plumberErr || !plumber) {
      throw new Error('Test setup failed: Could not find a plumber in Supabase');
    }

    const { data: initialLead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          homeowner_name: 'Status Verification Homeowner',
          homeowner_phone: '+15559998888',
          plumber_id: plumber.id,
          status: 'DISPATCHED',
          payout_paid: false,
          paid_at: null,
        },
      ])
      .select()
      .single();

    if (insertErr || !initialLead) {
      throw new Error(`Test setup failed: Lead insertion failed: ${insertErr?.message}`);
    }

    createdLeadId = initialLead.id;
    console.log(`Initial lead created. ID: ${createdLeadId}, Status: ${initialLead.status}, payout_paid: ${initialLead.payout_paid}`);

    // 3. Test non-SIGNED update: Transition status to 'ON_SITE'
    console.log('\nTest 3: Updating status to ON_SITE (non-SIGNED)...');
    const res3 = await fetch(`${baseUrl}/api/leads/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify({
        lead_id: createdLeadId,
        status: 'ON_SITE',
      }),
    });
    const data3 = await res3.json();
    console.log(`Status: ${res3.status}, Response:`, data3);

    if (res3.status !== 200 || !data3.success || !data3.lead) {
      throw new Error(`Test 3 failed: Non-SIGNED update failed: ${JSON.stringify(data3)}`);
    }

    if (data3.lead.status !== 'ON_SITE' || data3.lead.payout_paid !== false || data3.lead.paid_at !== null) {
      throw new Error(`Test 3 failed: Expected status ON_SITE with payout_paid false and paid_at null`);
    }
    console.log('✅ Test 3 passed! Status updated to ON_SITE without modifying payout fields.');

    // 4. Test SIGNED update: Transition status to 'SIGNED'
    console.log('\nTest 4: Updating status to SIGNED (EcoDry workflow)...');
    const res4 = await fetch(`${baseUrl}/api/leads/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SYNCRO_SCALE_API_KEY || 'syncro-scale-secret-key-2026',
      },
      body: JSON.stringify({
        lead_id: createdLeadId,
        status: 'SIGNED',
      }),
    });
    const data4 = await res4.json();
    console.log(`Status: ${res4.status}, Response:`, data4);

    if (res4.status !== 200 || !data4.success || !data4.lead) {
      throw new Error(`Test 4 failed: SIGNED update failed: ${JSON.stringify(data4)}`);
    }

    if (data4.lead.status !== 'SIGNED') {
      throw new Error(`Test 4 failed: Expected lead.status SIGNED, got ${data4.lead.status}`);
    }

    if (data4.lead.payout_paid !== true) {
      throw new Error(`Test 4 failed: Expected payout_paid true, got ${data4.lead.payout_paid}`);
    }

    if (!data4.lead.paid_at) {
      throw new Error('Test 4 failed: Expected paid_at timestamp to be set');
    }

    console.log(`✅ Test 4 passed! Status: SIGNED, payout_paid: ${data4.lead.payout_paid}, paid_at: ${data4.lead.paid_at}`);

    // 5. Database Direct Verification
    console.log('\nTest 5: Directly querying Supabase to verify updated record...');
    const { data: dbLead, error: dbErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', createdLeadId)
      .single();

    if (dbErr || !dbLead) {
      throw new Error(`Test 5 failed: DB query error: ${dbErr?.message}`);
    }

    if (dbLead.status !== 'SIGNED' || dbLead.payout_paid !== true || !dbLead.paid_at) {
      throw new Error('Test 5 failed: Database state does not match expected SIGNED payout values');
    }
    console.log('✅ Test 5 passed! Direct DB check confirmed status: SIGNED, payout_paid: true, paid_at set.');

    console.log('\n🎉 ALL UPDATE STATUS TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (createdLeadId) {
      console.log(`\nCleaning up test lead ID ${createdLeadId} from Supabase...`);
      await supabaseAdmin.from('leads').delete().eq('id', createdLeadId);
      console.log('Cleanup complete.');
    }
    server.close();
  }
}

runUpdateVerification();
