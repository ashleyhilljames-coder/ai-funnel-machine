import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import twilio from 'twilio';
import { saveCallRecord, CallRecord } from '../services/db';
import { triggerDispatchAlert } from '../services/dispatchAlert';
import { LeadGuard } from '../outbound/leadGuard';

const router = Router();
const leadGuard = new LeadGuard();

// ==========================================
// 0. INCOMING CALL TWIML HANDLER: /api/telephony/incoming
// Called by Twilio Webhook when a call rings.
// Directs Twilio to open a WebSocket stream with our server.
// ==========================================
router.post('/incoming', (req: Request, res: Response) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const host = req.headers.host;

  if (twilioAuthToken && twilioSignature) {
    const url = `https://${host}${req.originalUrl || req.url}`;
    const isValid = twilio.validateRequest(twilioAuthToken, twilioSignature, url, req.body || {});
    if (!isValid) {
      console.warn('[Twilio Webhook]: Invalid signature.');
      return res.status(401).send('Unauthorized');
    }
  } else if (twilioAuthToken && !twilioSignature) {
    return res.status(401).send('Unauthorized');
  }

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

    const prospect: any = leadGuard.getCustomerProfileByPhone(cleanPhone);

    if (prospect) {
      let notes = 'No prior notes.';
      let address = 'Unknown';
      
      try {
        const obs = JSON.parse(prospect.observations || '[]');
        if (obs.length > 0) notes = obs.join(' | ');
      } catch (e) {}

      try {
        const traits = JSON.parse(prospect.extracted_traits || '{}');
        if (traits.address) address = traits.address;
      } catch (e) {}

      return res.json({
        found: true,
        prospect_name: prospect.name || 'Valued Caller',
        past_notes: notes,
        system_instruction: `Greet ${prospect.name || 'Valued Caller'} warmly. Property address on file: ${address}.`,
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

    if (webhookSecret) {
      if (!signature) {
        return res.status(401).json({ error: 'Unauthorized: Missing signature' });
      }
      
      const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf-8') : JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Post-Call Webhook]: Invalid HMAC signature header.');
        return res.status(401).json({ error: 'Unauthorized signature' });
      }
    }

    // console.log removed to prevent credential exposure

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

      // Extract details from data_collection
      const collectedData = data.analysis?.data_collection_results || {};
      const prospectName = collectedData.prospect_name?.value || 'Unknown';
      const address = collectedData.property_address?.value || 'Unknown';
      const extractedTraits = JSON.stringify({ address, ...collectedData });
      const observations = data.analysis?.transcript_summary || summary;
      
      const email = collectedData.email?.value || `${callerPhone.replace(/[^0-9]/g, '')}@placeholder.com`;

      leadGuard.upsertCustomerProfile({
        email,
        name: prospectName,
        phone: callerPhone,
        extractedTraits,
        observations
      });

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
    const logs = leadGuard.getAllCallLogs();
    const calls = logs.map(log => ({
      createdAt: log.started_at,
      conversationId: log.id,
      callerPhone: log.caller_phone || 'Unknown',
      callDuration: `${log.duration_seconds || 0}s`,
      status: log.action_taken || 'pending',
      summary: log.agent_activity || 'No summary available.'
    }));
    
    return res.json({ success: true, calls });
  } catch (err) {
    console.error('[API Error] Failed to fetch recent calls:', err);
    return res.status(500).json({ success: false, error: 'Failed to read call logs' });
  }
});

export default router;