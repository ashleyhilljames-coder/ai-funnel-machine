import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { VoicePipeline } from './pipeline.js';

export const mediaStreamWss = new WebSocketServer({ noServer: true });
export const dashboardWss = new WebSocketServer({ noServer: true });

export interface ActiveVoiceSession {
  callId: string;
  streamSid: string;
  clientId: string;
  source: string;
  startTime: number;
  transcript: string[];
  pipeline: VoicePipeline;
}

export const activeVoiceSessions = new Map<string, ActiveVoiceSession>();

// Track connected dashboard clients
const dashboardClients = new Set<WebSocket>();

dashboardWss.on('connection', (ws: WebSocket) => {
  console.log('[Dashboard Socket] Client connected to live stream.');
  dashboardClients.add(ws);

  // Send current active sessions immediately upon connection
  const currentSessions = Array.from(activeVoiceSessions.values()).map(s => ({
    callId: s.callId,
    clientId: s.clientId,
    source: s.source,
    startTime: s.startTime,
    transcript: s.transcript
  }));
  ws.send(JSON.stringify({ event: 'active_sessions', sessions: currentSessions }));

  ws.on('close', () => {
    dashboardClients.delete(ws);
    console.log('[Dashboard Socket] Client disconnected.');
  });
});

export function broadcastToDashboards(data: any) {
  const payload = JSON.stringify(data);
  for (const client of dashboardClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Media stream handler
mediaStreamWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const clientId = url.searchParams.get('clientId') || 'default_client';
  
  const tempCallId = `tel_${Math.random().toString(36).substring(2, 10)}`;
  let callId = tempCallId;
  let streamSid = '';
  let pipeline: VoicePipeline | null = null;

  console.log(`[Media Stream] Inbound connection. Client ID: ${clientId}`);

  ws.on('message', async (message: WebSocket.Data) => {
    try {
      const msg = JSON.parse(message.toString());
      
      switch (msg.event) {
        case 'start':
          streamSid = msg.streamSid;
          callId = msg.start.callSid || tempCallId;
          
          console.log(`[Media Stream] Received start event. CallSid: ${callId}, StreamSid: ${streamSid}`);
          
          // Instantiate pipeline
          pipeline = new VoicePipeline(ws, clientId, callId, (transcript) => {
            const session = activeVoiceSessions.get(callId);
            if (session) {
              session.transcript = transcript;
            }
            broadcastToDashboards({
              event: 'transcript_updated',
              callId,
              transcript
            });
          });

          // Register active voice session
          activeVoiceSessions.set(callId, {
            callId,
            streamSid,
            clientId,
            source: 'telephony',
            startTime: Date.now(),
            transcript: [],
            pipeline
          });

          // Broadcast session started to dashboards
          broadcastToDashboards({
            event: 'call_connected',
            callId,
            clientId,
            source: 'telephony',
            startTime: Date.now()
          });

          // Start the pipeline
          await pipeline.start(streamSid);
          break;

        case 'media':
          if (pipeline && msg.media?.payload) {
            pipeline.handleInboundAudio(msg.media.payload);
          }
          break;

        case 'stop':
          console.log(`[Media Stream] Received stop event for StreamSid: ${streamSid}`);
          cleanup();
          break;
      }
    } catch (err) {
      console.error('[Media Stream] Error handling message:', err);
    }
  });

  const cleanup = () => {
    if (pipeline) {
      pipeline.destroy();
      pipeline = null;
    }
    if (activeVoiceSessions.has(callId)) {
      activeVoiceSessions.delete(callId);
      broadcastToDashboards({
        event: 'call_disconnected',
        callId
      });
    }
  };

  ws.on('close', () => {
    console.log(`[Media Stream] Connection closed for call ${callId}`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error(`[Media Stream] WebSocket error on call ${callId}:`, err.message);
    cleanup();
  });
});
