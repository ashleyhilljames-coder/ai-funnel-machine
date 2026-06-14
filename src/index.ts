import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './server.js';
import dotenv from 'dotenv';
dotenv.config();

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/voice-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket) => {
  console.log('🎙️ [Voice Server] Web browser connected.');
  const model = "gpt-4o-realtime-preview-2024-10-01";
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "realtime=v1" } }
  );

  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain.');
    setTimeout(() => {
      if (openAiWs.readyState === WebSocket.OPEN) {
        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a brilliant AI automation specialist for Agentic Nexus.',
            voice: 'alloy', 
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: { type: 'server_vad' }
          },
        };
        openAiWs.send(JSON.stringify(sessionUpdate));
        console.log('⚡ [OpenAI] Production Session configuration sent.');
      }
    }, 250);
  });

  ws.on('message', (message: Buffer) => {
    if (openAiWs.readyState === WebSocket.OPEN) {
      openAiWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: message.toString('base64'),
      }));
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

  openAiWs.on('close', (code, reason) => {
    console.log(`🔌 [OpenAI] Closed. Code: ${code}, Reason: ${reason}`);
  });

  ws.on('error', (err) => console.error('❌ Browser WS Error:', err));
  openAiWs.on('error', (err) => console.error('❌ OpenAI WS Error:', err));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log('🚀 AI Funnel Machine listening on port 3000');
});

async function closeSubscriptions() { console.log('Shutting down...'); }
process.on('SIGINT', async () => { await closeSubscriptions(); process.exit(0); });
