import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { saveCallRecord, CallRecord } from '../services/db';
import { triggerDispatchAlert } from '../services/dispatchAlert';
import fs from 'fs';
import path from 'path';

const router = Router();

// ==========================================
// 0. INCOMING CALL TWIML HANDLER: /api/telephony/incoming
// Called by Twilio Webhook when a call rings.
// Directs Twilio to open a WebSocket stream with our server.
// ==========================================
router.post('/incoming', (req: Request, res: Response) => {
  const host = req.headers.host;

  // TwiML response instructing Twilio to open a bi-directional Media Stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://${host}/media" />
      </Connect>
    </Response>`;

  res.type('text/xml');
  return res.send(twiml);
});

// ==========================================
// 1. INBOUND LOOKUP: /api/telephony/prospect-context
// Called by ElevenLabs Webhook Tool at start of call
// ==========================================
router.post('/prospect-context', async (req: Request, res: Response) => {
  try {
    const callerPhone = req.body.caller_phone || req.body.phone_number || req.body.phone;

    if (!callerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required caller_phone parameter.',
      });
    }

    const cleanPhone = callerPhone.replace(/[^\d+]/g, '');

    // TODO: Connect to your DB (e.g. const prospect = await db.findProspect(cleanPhone);)
    const prospect: any = null; // Set to null until DB is connected so it falls through cleanly

    if (prospect) {
      return res.json({
        found: true,
        prospect_name: prospect.name,
        past_notes: prospect.notes || 'No prior notes.',
        system_instruction: `Greet ${prospect.name} warmly. Property address on file: ${prospect.address || 'Unknown'}.`,
      });
    }

    // Default fallback for new property management / mitigation callers
    return res.json({
      found: false,
      prospect_name: 'Valued Caller',
      past_notes: 'First-time caller. No prior emergency history on file.',
      system_instruction: 'Treat as a new caller. Gather their full name, property address, and details regarding their mitigation emergency.',
    });

  } catch (error) {
    console.error('[Telephony Context Error]:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ==========================================
// 2. POST-CALL SYNC: /api/telephony/post-call
// Executed by ElevenLabs automatically when call ends
// ==========================================
router.post('/post-call', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-elevenlabs-signature'] as string;
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf-8') : '';

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Post-Call Webhook]: Invalid HMAC signature header.');
        return res.status(401).json({ error: 'Unauthorized signature' });
      }
    }

    console.log('[Post-Call Data Received]:', JSON.stringify(req.body, null, 2));

    const { type, data } = req.body;

    // Filter for post-call transcription payloads
    if (type === 'post_call_transcription' || data) {
      const conversationId = data.conversation_id;
      const transcript = data.transcript || [];
      const summary = data.analysis?.transcript_summary || 'No summary generated.';
      const callDuration = data.metadata?.call_duration_secs || 0;
      const callerPhone = data.conversation_initiation_client_data?.dynamic_variables?.caller_phone || 'Unknown';

      const callRecord: CallRecord = {
        conversationId,
        callerPhone,
        callDuration,
        summary,
        transcript,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // 1. Save to CSV & Database
      await saveCallRecord(callRecord);

      // 2. Trigger Instant Notification Alert
      await triggerDispatchAlert(callRecord);
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('[Post-Call Webhook Error]:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 3. GET RECENT CALLS: /api/telephony/recent-calls
// Reads recorded calls from CSV for dashboard
// ==========================================
router.get('/recent-calls', (_req, res) => {
  try {
    const csvPath = path.resolve(__dirname, '../../mitigation_leads.csv');

    if (!fs.existsSync(csvPath)) {
      return res.json({ success: true, calls: [] });
    }

    const fileData = fs.readFileSync(csvPath, 'utf8').trim();
    const lines = fileData.split('\n');

    if (lines.length <= 1) {
      return res.json({ success: true, calls: [] });
    }

    // Header is line 0; parse data rows (newest first)
    const records = lines.slice(1).reverse().map((line) => {
      // Regex matches standard CSV comma splits while respecting quotes
      const matches = line.match(/(?:[^\",]|\"[^\"]*\")+/g) || [];
      const clean = matches.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));

      return {
        createdAt: clean[0] || '',
        conversationId: clean[1] || '',
        callerPhone: clean[2] || '',
        callDuration: clean[3] || '',
        status: clean[4] || 'pending',
        summary: clean[5] || 'No summary available.'
      };
    });

    return res.json({ success: true, calls: records });
  } catch (err) {
    console.error('[API Error] Failed to fetch recent calls:', err);
    return res.status(500).json({ success: false, error: 'Failed to read call logs' });
  }
});

export default router;