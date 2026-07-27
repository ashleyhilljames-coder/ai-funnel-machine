import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import app from './server.js';
import telephonyRouter from './routes/telephony';

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
app.use('/api/telephony', telephonyRouter);

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
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
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
          break;

        case 'media':
          // Raw mu-law audio chunk from caller (data.media.payload)
          break;

        case 'stop':
          console.log(`📞 [Twilio Stream]: Call ended. StreamSid: ${streamSid}`);
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('❌ [Twilio Stream Error]: Failed to parse payload:', err);
    }
  });

  ws.on('close', () => {
    console.log('🔌 [Twilio Stream] Call disconnected.');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 AI Funnel Machine listening on port ${PORT}`);
});

async function closeSubscriptions() { console.log('Shutting down...'); }
process.on('SIGINT', async () => { await closeSubscriptions(); process.exit(0); });