import express from 'express';
import path from 'path';
import { ingestLead } from './ingest.js';
import { ZodError, type ZodIssue } from 'zod';
import twilio from 'twilio'; // 📞 Added the Twilio package import

const app = express();

// Initialize the Twilio Client using your safe environment credentials
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Global Middleware
app.use(express.json());

// 📂 Tell Express exactly where to find the public directory using an absolute path
app.use(express.static(path.join(__dirname, '../public')));

// 📋 Standard Intake Route
app.post('/api/intake', async (req, res) => {
  console.log('📥 Received standard intake payload:', req.body);
  res.status(200).json({ status: 'received' });
});

// 🚀 Production Intake Route with Zod Validation & Pub/Sub Publishing
app.post('/api/leads', async (req, res) => {
  try {
    const { messageId, lead } = await ingestLead(req.body);
    res.status(202).json({
      success: true,
      messageId,
      leadId: lead.id,
      createdAt: lead.createdAt,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('⚠️ Incoming lead validation failed:', error.issues);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    console.error('❌ Ingestion pipeline failure:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing lead',
    });
  }
});

// ⚡ LIVE INTERCEPT ROUTE: Instantly hands a streaming AI call over to a live field tech's cell phone
app.post('/api/call/intercept', async (req, res) => {
  const { callSid, technicianPhoneNumber } = req.body;

  if (!callSid || !technicianPhoneNumber) {
    return res.status(400).json({ error: 'Missing callSid or technicianPhoneNumber' });
  }

  try {
    console.log(`⚡ Intercept triggered. Redirecting active call ${callSid} to technician phone...`);

    // Signal Twilio to hot-swap the stream away from the AI engine straight to the human line
    await twilioClient.calls(callSid).update({
      twiml: `
        <Response>
          <Say voice="Polly.Joanna-Premium">Connecting you to a live emergency specialist. One moment.</Say>
          <Dial>
            <Number>${technicianPhoneNumber}</Number>
          </Dial>
        </Response>
      `
    });

    res.status(200).json({ success: true, message: 'Call redirect successfully initialized.' });
  } catch (error) {
    console.error('❌ Failed to intercept Twilio call:', error);
    res.status(500).json({ error: 'Failed to execute call takeover layer.' });
  }
});

export default app;