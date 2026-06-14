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
  
  // Use the exact model version for the Realtime API
  const model = "gpt-4o-realtime-preview-2024-10-01"; 
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "OpenAI-Beta": "realtime=v1" } }
  );

  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain.');
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a brilliant AI automation specialist for Syncro Scale. Respond briefly.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: { type: 'server_vad' }
      },
    };
    openAiWs.send(JSON.stringify(sessionUpdate));
    console.log('⚡ [OpenAI] Session configuration synced.');
  });

  ws.on('message', (message: any) => {
    try {
      const json = JSON.parse(message.toString());
      let base64Audio = json.data || json.audio;

      if (base64Audio) {
        // Log the payload as seen in your screenshot
        console.log(`📦 Chunks payload head: "${base64Audio.substring(0, 50)}..." (Length: ${base64Audio.length})`);

        if (openAiWs.readyState === WebSocket.OPEN) {
          // Explicitly push to the OpenAI audio buffer
          openAiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      }
    } catch(err) {
      // Binary fallback if data arrives as a buffer
      const base64Audio = Buffer.from(message).toString('base64');
      if (openAiWs.readyState === WebSocket.OPEN) {
        openAiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      }
    }
  });

  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      
      // Print live transcript deltas directly to terminal
      if (response.type === 'response.audio_transcript.delta' && response.delta) {
        process.stdout.write(response.delta);
      }
      
      if (response.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('\n📝 User Utterance:', response.transcript);
      }

      if (response.type === 'response.audio.delta' && response.delta) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: "audio_chunk", data: response.delta }));
        }
      }
    } catch (err) { }
  });

  ws.on('close', () => {
    console.log('\n🔌 Browser disconnected.');
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
  });

  openAiWs.on('error', (err) => console.error('❌ OpenAI Error:', err.message));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 AI Funnel Machine listening on port ${PORT}`);
});