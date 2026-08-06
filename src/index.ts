import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import app from './server.js';
import telephonyRouter from './routes/telephony';
import { processEmergencyDispatch } from './processor.js';
import crypto from 'crypto';
import leadRoutes from './routes/leads';
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use('/api/telephony', telephonyRouter);
app.use('/api/leads', leadRoutes);
const httpServer = http.createServer(app);

// Helper to push real-time events to all connected dashboard tabs
function broadcastToDashboard(payload: object) {
  [browserWss, twilioWss].forEach((wss) => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload));
      }
    });
  });
}

// Create WebSocket servers for both Web Browser testing and Twilio Media Streams
const browserWss = new WebSocketServer({ noServer: true });
const twilioWss = new WebSocketServer({ noServer: true });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// -------------------------------------------------------------
// HTTP UPGRADE HANDLER (Routes /voice-stream and /media)
// -------------------------------------------------------------
httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  
  if (url.pathname === '/voice-stream') {
    browserWss.handleUpgrade(request, socket, head, (ws) => {
      browserWss.emit('connection', ws, request);
    });
  } else if (url.pathname === '/media') {
    twilioWss.handleUpgrade(request, socket, head, (ws) => {
      twilioWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// =============================================================
// 1. WEB BROWSER VOICE STREAMING (/voice-stream)
// =============================================================
browserWss.on('connection', (ws: WebSocket) => {
  console.log('🎙️ [Voice Server] Web browser connected.');
  const model = "gpt-4o-realtime-preview-2024-10-01";
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "realtime=v1" } }
  );

  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain (Browser Session).');
    setTimeout(() => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        const companyName = "Syncro Scale Property Management & Mitigation Services";

        const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        voice: 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        instructions: `You are a strict, automated Emergency Dispatcher for ${companyName}. You are a professional receptionist, NOT a technician.

CRITICAL RESTRICTION: NO DIY ADVICE
- NEVER give the caller DIY instructions, repair steps, or advice.
- Giving advice is strictly FORBIDDEN. Your only response to an emergency is to take down their information for dispatch.

WORKFLOW STEPS
1. Greeting: Say exactly: "Thank you for calling ${companyName}. How can we help you with your property today?"
2. Intake: Listen to the emergency.
3. Information Gathering: Calmly ask for their property address and confirmation of the severity.
4. Log Lead: Call the log_emergency_lead tool as soon as you have gathered the property address, emergency issue, and severity level.
5. Wrap-up: State that emergency dispatch has been initiated and a team is on the way.`,
        tools: [
          {
            type: 'function',
            name: 'log_emergency_lead',
            description: 'Logs emergency dispatch intake information directly into system records.',
            parameters: {
              type: 'object',
              properties: {
                propertyAddress: { type: 'string', description: 'Full property address provided by caller' },
                emergencyIssue: { type: 'string', description: 'Brief description of the emergency' },
                severityLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }
              },
              required: ['propertyAddress', 'emergencyIssue', 'severityLevel']
            }
          }
        ],
        tool_choice: 'auto'
      }
    };

        openAiWs.send(JSON.stringify(sessionUpdate));
        console.log('⚡ [OpenAI] Browser Session configuration sent.');
      }
    }, 250);
  });

  ws.on('message', (message: Buffer | string) => {
    try {
      // 1. Check if the message is a JSON object (System Note Interjection)
      const data = JSON.parse(message.toString());

      if (data.type === 'system_interjection') {
        console.log(`⚡ [Interjection Injected]: ${data.note}`);

        if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
          // Inject instruction into the OpenAI Realtime conversation
          openAiWs.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: `[SYSTEM INSTRUCTION / MID-CALL NOTE]: ${data.note}` }]
            }
          }));
          // Trigger the AI to acknowledge and adapt immediately
          openAiWs.send(JSON.stringify({ type: 'response.create' }));
        }
      }
    } catch {
      // 2. Binary Audio Buffer (Raw Microphone Stream)
      if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: message.toString('base64'),
        }));
      }
    }
  });

  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      if (response.type === 'response.audio.delta' && response.delta) {
        if (ws.readyState === WebSocket.OPEN) ws.send(Buffer.from(response.delta, 'base64'));
      }
    } catch (err) { console.error('❌ Stream Error:', err); }
  });

  ws.on('close', () => {
    console.log('🔌 [Voice Server] Browser disconnected.');
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
  });

  openAiWs.on('error', (err) => console.error('❌ Browser WS Error:', err));
  openAiWs.on('error', (err) => console.error('❌ OpenAI WS Error:', err));
});

// =============================================================
// 2. TWILIO MEDIA STREAMING (/media)
// =============================================================
twilioWss.on('connection', (ws: WebSocket) => {
  console.log('📞 [Twilio Stream] Phone call connected via WebSocket.');

  let streamSid: string | null = null;
  let callSid: string | null = null;

  // STEP 1: Establish OpenAI Realtime Connection for this phone call
  const model = "gpt-4o-realtime-preview-2024-10-01";
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );

  // Configure OpenAI Session for Twilio Format (g711_ulaw)
  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain (Twilio Call Session).');
    
    setTimeout(() => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        const companyName = "Syncro Scale Property Management & Mitigation Services";

        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'alloy',
            input_audio_format: 'g711_ulaw',  // Matches Twilio 8kHz stream
            output_audio_format: 'g711_ulaw', // Matches Twilio 8kHz stream
            instructions: `You are a strict, automated Emergency Dispatcher for ${companyName}. You are a professional receptionist, NOT a technician.

CRITICAL RESTRICTION: NO DIY ADVICE
- NEVER give the caller DIY instructions, repair steps, or advice.
- Giving advice is strictly FORBIDDEN. Your only response to an emergency is to take down their information for dispatch.

WORKFLOW STEPS
1. Greeting: Say exactly: "Thank you for calling ${companyName}. How can we help you with your property today?"
2. Intake: Listen to the emergency.
3. Information Gathering: Calmly ask for their property address and confirmation of the severity.
4. Wrap-up: State that emergency dispatch has been initiated and a team is on the way.`
          }
        };
        openAiWs.send(JSON.stringify(sessionUpdate));
      }
    }, 250);
  });

  // STEP 2: Handle incoming Twilio messages & send audio to OpenAI
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.event) {
        case 'connected':
          console.log('📞 [Twilio Stream]: Event connected.');
          break;

        case 'start':
          streamSid = data.start.streamSid;
callSid = data.start.callSid;
          console.log(`📞 [Twilio Stream]: Stream started. CallSid: ${callSid}, StreamSid: ${streamSid}`);
openAiWs.send(JSON.stringify({
  type: 'response.create'
}));

          // Broadcast call initiation to Dashboard
          broadcastToDashboard({
            event: 'call_started',
            callSid,
            streamSid,
            timestamp: new Date().toISOString()
          });
          break;

        case 'media':
          // Pipe raw caller audio chunk (g711_ulaw base64) directly to OpenAI
          if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: data.media.payload,
            }));
          }
          break;

        case 'clear':
          // Caller interrupted/barged in — tell OpenAI to cancel current response
          console.log('⚡ [Twilio Stream]: Barge-in / Clear event received.');
          if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.send(JSON.stringify({ type: 'response.cancel' }));
          }
          break;

        case 'stop':
          console.log(`📞 [Twilio Stream]: Call ended. StreamSid: ${streamSid}`);
          broadcastToDashboard({
            event: 'call_ended',
            callSid,
            streamSid,
            timestamp: new Date().toISOString()
          });
          if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
          break;
      }
    } catch (err) {
      console.error('❌ [Twilio Stream Error]: Failed to parse payload:', err);
    }
  });

  // STEP 3: Handle OpenAI AI Audio responses & send to Twilio
openAiWs.on('message', (data) => {
  try {
    const response = JSON.parse(data.toString());

    // 🔍 Log all OpenAI incoming events
    console.log('🤖 [OpenAI Event]:', response.type);

    // 1. Audio streaming back to Twilio
    if (response.type === 'response.audio.delta' && response.delta) {
      if (ws.readyState === WebSocket.OPEN && streamSid) {
        const twilioPayload = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: response.delta // g711_ulaw base64
          }
        };
        ws.send(JSON.stringify(twilioPayload));

        // Broadcast active speech indicator to Dashboard
        broadcastToDashboard({
          event: 'ai_speaking',
          callSid
        });
      }
    }

    // 2. Handle tool call execution from OpenAI
    if (response.type === 'response.function_call_arguments.done') {
      if (response.name === 'log_emergency_lead') {
        const args = JSON.parse(response.arguments);

        const emergencyLead = {
          id: crypto.randomUUID(),
          callSid: callSid || 'UNKNOWN_CALL',
          source: 'TELEPHONY_DISPATCH',
          funnelStep: 'DISPATCH_INTAKE',
          propertyAddress: args.propertyAddress,
          emergencyIssue: args.emergencyIssue,
          severityLevel: args.severityLevel,
          dispatchStatus: 'PENDING' as const,
          metadata: {},
          createdAt: new Date().toISOString()
        };

        processEmergencyDispatch(emergencyLead).then((result) => {
          console.log('✅ [Dispatch Logged Successfully]:', result);

          broadcastToDashboard({
            event: 'lead_logged',
            lead: emergencyLead
          });
        });

        // Acknowledge function call completion back to OpenAI
        openAiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: response.call_id,
            output: JSON.stringify({ success: true, message: 'Dispatch logged' })
          }
        }));

        openAiWs.send(JSON.stringify({ type: 'response.create' }));
      }
    }
  } catch (err) {
    console.error('❌ [OpenAI -> Twilio Stream Error]:', err);
  }
});
  // Cleanup on call termination
  ws.on('close', () => {
    console.log('🔌 [Twilio Stream] Call disconnected.');
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
  });

  openAiWs.on('error', (err) => console.error('❌ OpenAI Twilio WS Error:', err));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 syncro-scale-engine listening on port ${PORT}`);
});

async function closeSubscriptions() { console.log('Shutting down...'); }
process.on('SIGINT', async () => { await closeSubscriptions(); process.exit(0); });