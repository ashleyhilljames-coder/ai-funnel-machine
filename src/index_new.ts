import fs from 'fs';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './server.js';
import dotenv from 'dotenv';
import { appendLeadToSheet } from './services/sheetsService.js';
import { triggerLeadNotifications } from './services/notificationService.js';
import { runScraper } from './outbound/scrapeGoogleLeads.js';
import { runLeadImportPipeline } from './outbound/importLeads.js';
import { LeadGuard } from './outbound/leadGuard.js';
import { OutboundProcessor } from './outbound/processor.js';
import { sendOutboundEmail } from './outbound/sequences/outboundSequence.js';
import { getAvailableSlots, bookDispatch } from './services/calendarService.js';
import { createFieldPulseTicket, syncToRealEstateCRM, bookCalendlyAppointment } from './services/integrationService.js';
import { chunkText, generateEmbedding } from './services/embeddingService.js';
import { queryRAG, retrieveContext } from './services/ragService.js';
import OpenAI from 'openai';
dotenv.config();

const httpServer = http.createServer(app);
const voiceWss = new WebSocketServer({ noServer: true });
const twilioWss = new WebSocketServer({ noServer: true });
const chatWss = new WebSocketServer({ noServer: true });
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const leadGuard = new LeadGuard();

interface ClientConfig {
  name: string;
  niche: string;
  greeting: string;
  chatGreeting: string;
}

const HARDCODED_CLIENT_CONFIGS: Record<string, ClientConfig> = {
  restoration_lv: {
    name: "Restoration Pro Las Vegas",
    niche: "emergency water and fire mitigation",
    greeting: "Hello! Thank you for calling Restoration Pro Las Vegas. Can I get your full name, please?",
    chatGreeting: "Hello! Thank you for visiting Restoration Pro Las Vegas. Can I get your full name, please?"
  },
  roofing_sc: {
    name: "Sin City Roof Crew",
    niche: "storm damage, emergency roof leaks, and tarping",
    greeting: "Hello! Thank you for calling Sin City Roof Crew. Can I get your full name, please?",
    chatGreeting: "Hello! Thank you for visiting Sin City Roof Crew. Can I get your full name, please?"
  },
  property_apex: {
    name: "Apex Property Management",
    niche: "tenant emergency repairs and general maintenance",
    greeting: "Hello! Thank you for calling Apex Property Management emergencies line. Can I get your full name, please?",
    chatGreeting: "Hello! Welcome to the Apex Property Management maintenance support chat. Can I get your full name, please?"
  },
  realestate_nexus: {
    name: "Nexus Realty Group",
    niche: "residential property sales, leasing, and virtual tours",
    greeting: "Hello! Thank you for calling Nexus Realty Group. Can I get your full name, please?",
    chatGreeting: "Hello! Welcome to Nexus Realty Group. Can I get your full name, please?"
  },
  default_client: {
    name: "Syncro Scale",
    niche: "smart automations, AI integrations, workflow design, and digital transformation consulting",
    greeting: "Hello! Thank you for contacting Syncro Scale, your partner in smart automation. How can I help you today?",
    chatGreeting: "Hello! Thank you for contacting Syncro Scale, your partner in smart automation. How can I help you today?"
  }
};

const CLIENT_CONFIGS: Record<string, ClientConfig> = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    const dbSettings = leadGuard.getClientSettings(prop);
    if (dbSettings) {
      return {
        name: dbSettings.name,
        niche: dbSettings.niche,
        greeting: dbSettings.greeting,
        chatGreeting: dbSettings.chatGreeting
      };
    }
    return HARDCODED_CLIENT_CONFIGS[prop] || HARDCODED_CLIENT_CONFIGS.default_client;
  }
});

export function getVoiceAgentVoice(clientId: string): string {
  const settings = leadGuard.getClientSettings(clientId);
  return (settings && settings.voiceTone) ? settings.voiceTone : 'alloy';
}

export function getVoiceAgentInstructions(clientId: string): string {
  const settings = leadGuard.getClientSettings(clientId);
  if (settings && settings.voiceInstructions) {
    return settings.voiceInstructions;
  }
  const config = CLIENT_CONFIGS[clientId] || CLIENT_CONFIGS.default_client;
  
  if (clientId === 'realestate_nexus') {
    return `You are an elite, professional, and friendly real estate booking assistant for ${config.name}.
Your goal is to capture inbound B2C home buyer/renter leads and schedule virtual or in-person home showings.
CRITICAL: Maintain a helpful, polite tone. Do NOT offer financial advice or quote mortgage terms. Focus entirely on qualifying the prospect and scheduling their tour.

Be conversational, friendly, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.greeting}"

Collect the following details one-by-one or naturally:
1. Full name
2. Phone number
3. Email address
4. The address of the listing they are interested in (or general neighborhood/city)
5. Buyer criteria / preferences (e.g. beds/baths count, budget, buying vs renting)

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, immediately call 'get_available_slots' to retrieve available tour slots. Do not speak first. Present the times once you have them.
Once a slot is selected, call 'book_dispatch' to schedule their showing. Confirm the showing time and state that a buyer's agent will meet them at that time.`;
  }

  if (clientId === 'default_client') {
    return `You are a helpful, professional, and friendly smart automation voice consulting assistant for ${config.name}.
Your goal is to capture B2B inbound automation leads and schedule a discovery consultation call.
CRITICAL: Maintain a highly professional, tech-savvy, and consultative tone. Focus entirely on qualifying their automation needs and scheduling their consultation.

Be conversational, professional, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.greeting}"

Collect the following details one-by-one or naturally:
1. Full name
2. Phone number
3. Email address
4. Company name or website URL (map this to the 'address' parameter in 'append_lead')
5. Specific automation needs or project details (map this to the 'damageType' parameter in 'append_lead')

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, immediately call 'get_available_slots' to retrieve available slots for a discovery call. Do not speak first. Present the times once you have them.
Once a slot is selected, call 'book_dispatch' to schedule their discovery call on the calendar. Confirm the date and time.`;
  }

  // Fallback for emergency restoration/roofing and maintenance clients
  const isMitigation = clientId === 'restoration_lv' || clientId === 'roofing_sc';
  
  if (isMitigation) {
    return `You are a helpful, reassuring, and professional voice intake assistant for ${config.name}.
Your goal is to capture inbound emergency ${config.niche} leads and schedule their immediate dispatch.
CRITICAL: Maintain a professional, empathetic tone but remain strictly on-task. Do NOT offer diagnostic advice, do NOT suggest repair actions, and never advise the caller to inspect damage themselves (e.g., do NOT tell them to go on the roof or check structural damage, as this is a safety hazard). Focus entirely on gathering information.

Be conversational, reassuring, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.greeting}" Speak in English by default. If the caller requests or begins speaking in Spanish or another language, switch to and converse with them in their preferred language.

Collect the following details one-by-one or naturally as they flow:
1. Full name
2. Phone number
3. Email address
4. Property address experiencing the damage
5. The type of damage (e.g., water, fire, mold, roof leak)

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, tell the caller that an emergency response team has been dispatched immediately and a technician will be arriving shortly. Do not check available times or book appointments, as this is an immediate emergency dispatch service.`;
  }

  // General maintenance repairs (e.g. property_apex)
  return `You are a helpful, reassuring, and professional voice intake assistant for ${config.name}.
Your goal is to capture inbound emergency ${config.niche} leads and schedule their dispatch.
CRITICAL: Maintain a professional, empathetic tone but remain strictly on-task. Focus entirely on gathering information.

Be conversational, reassuring, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.greeting}" Speak in English by default.

Collect the following details one-by-one or naturally as they flow:
1. Full name
2. Phone number
3. Email address
4. Property address experiencing the damage
5. The type of damage (e.g., water, fire, mold, roof leak)

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, tell the caller you are checking available dispatch times and call 'get_available_slots'. Present the times and ask which works best.
Once a slot is selected, call 'book_dispatch'. Confirm the booked slot and state that a mitigation crew is scheduled to arrive at that time.`;
}

function getChatAgentInstructions(clientId: string): string {
  const config = CLIENT_CONFIGS[clientId] || CLIENT_CONFIGS.default_client;
  
  if (clientId === 'realestate_nexus') {
    return `You are an elite, professional, and friendly real estate booking assistant for ${config.name}, operating via our web chat portal.
Your goal is to capture inbound B2C home buyer/renter leads and schedule virtual or in-person home showings.
CRITICAL: Maintain a helpful, polite tone. Do NOT offer financial advice or quote mortgage terms. Focus entirely on qualifying the prospect and scheduling their tour.

Be conversational, friendly, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.chatGreeting}"

Collect the following details one-by-one or naturally:
1. Full name (accept whatever name, nickname, or alias the user provides; do not query, verify, or ask if it is real, and immediately move to the next detail)
2. Phone number
3. Email address
4. The address of the listing they are interested in (or general neighborhood/city)
5. Buyer criteria / preferences (e.g. beds/baths count, budget, buying vs renting)

You have a tool 'show_listings' to present active listings. Call this tool when the user asks for properties, homes, listings, or virtual tours, optionally specifying a neighborhood or budget.

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, immediately call 'get_available_slots' to retrieve available showing times. Do not output any conversational text before calling this tool. Once you have the slots, list them to the user and ask which works best.
Once a slot is selected, call 'book_dispatch' to schedule their showing. Confirm the showing time and state that a buyer's agent will meet them at that time.`;
  }

  if (clientId === 'default_client') {
    return `You are a helpful, professional, and friendly smart automation consulting assistant for ${config.name}, operating via our web chat portal.
Your goal is to capture B2B inbound automation leads and schedule a discovery consultation call.
CRITICAL: Maintain a highly professional, tech-savvy, and consultative tone. Focus entirely on qualifying their automation needs and scheduling their consultation.

Be conversational, professional, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.chatGreeting}"

Collect the following details one-by-one or naturally:
1. Full name (accept whatever name, nickname, or alias the user provides; do not query, verify, or ask if it is real, and immediately move to the next detail)
2. Phone number
3. Email address
4. Company name or website URL (map this to the 'address' parameter in 'append_lead')
5. Specific automation needs or project details (map this to the 'damageType' parameter in 'append_lead')

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, immediately call 'get_available_slots' to retrieve available slots. Do not output any conversational text before calling this tool. Once you have the slots, list them to the user and ask which works best.
Once a slot is selected, call 'book_dispatch' to schedule their discovery call on the calendar. Confirm the date and time.`;
  }

  // Fallback for emergency restoration/roofing and maintenance clients
  const isMitigation = clientId === 'restoration_lv' || clientId === 'roofing_sc';

  if (isMitigation) {
    return `You are a helpful, reassuring, and professional intake assistant for ${config.name}, operating via our web chat portal.
Your goal is to capture inbound emergency ${config.niche} leads and schedule their immediate dispatch.
CRITICAL: Maintain a professional, empathetic tone but remain strictly on-task. Do NOT offer diagnostic advice, do NOT suggest repair actions, and never advise the user to inspect damage themselves (e.g., do NOT tell them to go on the roof or check structural damage, as this is a safety hazard). Focus entirely on gathering information.

Be conversational, reassuring, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.chatGreeting}" Speak in English by default. If the user requests or begins speaking in Spanish or another language, switch to and converse with them in their preferred language.

Collect the following details one-by-one or naturally as they flow:
1. Full name (accept whatever name, nickname, or alias the user provides; do not query, verify, or ask if it is real, and immediately move to the next detail)
2. Phone number
3. Email address
4. Property address experiencing the damage
5. The type of damage (e.g., water, fire, mold, roof leak)

You have a tool 'show_pricing_guide' to present rates. Call this tool immediately if the user asks for rates, pricing, pricing guide, or pricing sheets, even if you have not finished capturing all 5 qualification details.

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, inform the user that their emergency dispatch request has been saved, and an emergency response team is being dispatched to their location immediately. Do not check available times or book appointments, as this is an immediate emergency dispatch service.`;
  }

  // General maintenance repairs (e.g. property_apex)
  return `You are a helpful, reassuring, and professional intake assistant for ${config.name}, operating via our web chat portal.
Your goal is to capture inbound emergency ${config.niche} leads and schedule their dispatch.
CRITICAL: Maintain a professional, empathetic tone but remain strictly on-task. Focus entirely on gathering information.

Be conversational, reassuring, and concise (respond briefly, in 1-2 sentences).
Always greet the user in English. For example: "${config.chatGreeting}" Speak in English by default.

Collect the following details one-by-one or naturally as they flow:
1. Full name (accept whatever name, nickname, or alias the user provides; do not query, verify, or ask if it is real, and immediately move to the next detail)
2. Phone number
3. Email address
4. Property address experiencing the damage
5. The type of damage (e.g., water, fire, mold, roof leak)

You have a tool 'show_pricing_guide' to present rates. Call this tool immediately if the user asks for rates, pricing, pricing guide, or pricing sheets, even if you have not finished capturing all 5 qualification details.

Once you have gathered all 5 details, immediately call 'append_lead'.
After 'append_lead' completes, tell the user you are checking available dispatch times and call 'get_available_slots'. Present the times and ask which works best.
Once a slot is selected, call 'book_dispatch'. Confirm the booked slot and state that a mitigation crew is scheduled to arrive at that time.`;
}

// GET and POST endpoint for Twilio incoming calls
app.all('/incoming-call', (req, res) => {
  console.log(`📞 Received HTTP webhook request (${req.method}) from Twilio for incoming call.`);
  const host = req.headers.host;
  const clientId = req.query.clientId || 'default_client';
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/twilio-stream?clientId=${clientId}" />
  </Connect>
</Response>`);
});

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/voice-stream') {
    voiceWss.handleUpgrade(request, socket, head, (ws) => {
      voiceWss.emit('connection', ws, request);
    });
  } else if (url.pathname === '/twilio-stream') {
    twilioWss.handleUpgrade(request, socket, head, (ws) => {
      twilioWss.emit('connection', ws, request);
    });
  } else if (url.pathname === '/chat-stream') {
    chatWss.handleUpgrade(request, socket, head, (ws) => {
      chatWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

function pcmToWav(buffer: Buffer, sampleRate: number = 24000, bitsPerSample: number = 16, audioFormat: number = 1): Buffer {
  const numChannels = 1;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length;
  const chunkSize = 36 + dataSize;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(chunkSize, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(audioFormat, 20); // 1 = PCM, 7 = MULAW
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, buffer]);
}

interface ActiveCallRecord {
  id: string;
  source: 'browser' | 'telephony' | 'web_chat';
  buffers: Buffer[];
  transcript: string[];
  startTime: number;
  callerName?: string;
  callerPhone?: string;
  callerEmail?: string;
  callerAddress?: string;
  damageType?: string;
  clientId?: string;
  tokensUsed?: number;
  dispatchCount?: number;
}

const activeCalls = new Map<string, ActiveCallRecord>();

voiceWss.on('connection', (ws: WebSocket, req: any) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const clientId = url.searchParams.get('clientId') || 'default_client';

  console.log(`🎙️ [Voice Server] Web browser connected. Client: ${clientId}`);
  const callId = `browser_${Math.random().toString(36).substring(2, 10)}`;

  activeCalls.set(callId, {
    id: callId,
    source: 'browser',
    buffers: [],
    transcript: [],
    startTime: Date.now(),
    clientId,
    tokensUsed: 0,
    dispatchCount: 0
  });

  leadGuard.createCallLog(callId, 'browser', clientId);
  
  // Use the exact model version for the Realtime API
  const model = "gpt-realtime"; 
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain.');
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        output_modalities: ['audio'],
        instructions: getVoiceAgentInstructions(clientId),
        voice: getVoiceAgentVoice(clientId),
        audio: {
          input: {
            transcription: {
              model: 'whisper-1'
            }
          }
        },
        tools: [
          {
            type: 'function',
            name: 'append_lead',
            description: 'Saves the captured emergency lead details to the Google Sheet database.',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'The contact person\'s full name' },
                phone: { type: 'string', description: 'The contact phone number' },
                email: { type: 'string', description: 'The contact email address' },
                address: { type: 'string', description: 'The property address experiencing damage' },
                damageType: { type: 'string', description: 'Description of the damage type (e.g. water, fire, mold, roof leak)' }
              },
              required: ['name', 'phone', 'email', 'address', 'damageType']
            }
          },
          {
            type: 'function',
            name: 'get_available_slots',
            description: 'Retrieves the list of available emergency dispatch date/time slots for a technician to visit.',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            type: 'function',
            name: 'book_dispatch',
            description: 'Saves the scheduled dispatch appointment slot on the calendar.',
            parameters: {
              type: 'object',
              properties: {
                timeSlot: {
                  type: 'string',
                  description: 'The selected date/time slot exactly as returned by get_available_slots (e.g. "Monday, Jun 15 at 10:00 AM")'
                }
              },
              required: ['timeSlot']
            }
          }
        ],
        tool_choice: 'auto'
      },
    };
    openAiWs.send(JSON.stringify(sessionUpdate));
    console.log('⚡ [OpenAI] Session configuration synced.');
    
    // Trigger initial greeting response
    openAiWs.send(JSON.stringify({ type: 'response.create' }));
    console.log('🗣️ [OpenAI] Triggered initial greeting response.');
  });

  ws.on('message', (message: any) => {
    try {
      const json = JSON.parse(message.toString());
      let base64Audio = json.data || json.audio;

      if (base64Audio) {
        // Log the payload as seen in your screenshot
        console.log(`📦 Chunks payload head: "${base64Audio.substring(0, 50)}..." (Length: ${base64Audio.length})`);

        // Record user audio
        const record = activeCalls.get(callId);
        if (record) {
          record.buffers.push(Buffer.from(base64Audio, 'base64'));
        }

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
      const record = activeCalls.get(callId);
      if (record) {
        record.buffers.push(Buffer.from(base64Audio, 'base64'));
      }
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
      if (response.type === 'session.created' || response.type === 'session.updated') {
        console.log(`🤖 [OpenAI Event] ${response.type}:`, JSON.stringify(response.session, null, 2));
      } else {
        console.log('🤖 [OpenAI Event]:', response.type);
      }
      
      if (response.type === 'error') {
        console.error('❌ OpenAI Error Event:', JSON.stringify(response.error, null, 2));
      }
      
      // Print live transcript deltas directly to terminal
      if (response.type === 'response.output_audio_transcript.delta' && response.delta) {
        process.stdout.write(response.delta);
      }
      
      if (response.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('\n📝 User Utterance:', response.transcript);
        const record = activeCalls.get(callId);
        if (record && response.transcript) {
          record.transcript.push(`[User]: ${response.transcript.trim()}`);
          
          // Inject matching RAG context dynamically into the voice session
          retrieveContext(clientId, response.transcript)
            .then(context => {
              if (context && openAiWs.readyState === WebSocket.OPEN) {
                console.log(`🧠 [RAG Voice] Injecting dynamic system context: ${context.substring(0, 60)}...`);
                openAiWs.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'message',
                    role: 'system',
                    content: [
                      {
                        type: 'input_text',
                        text: `The following is relevant facts context from the client's knowledge base:\n${context}`
                      }
                    ]
                  }
                }));
              }
            })
            .catch(err => console.error("❌ RAG Voice context fetch error:", err));
        }
      }

      // Handle function calls when model finished execution
      if (response.type === 'response.done') {
        const usage = response.response?.usage;
        if (usage) {
          const record = activeCalls.get(callId);
          if (record) {
            record.tokensUsed = (record.tokensUsed || 0) + (usage.total_tokens || 0);
            leadGuard.updateCallLog(callId, { tokensUsed: record.tokensUsed });
          }
        }
        const outputItems = response.response?.output || [];
        for (const item of outputItems) {
          if (item.type === 'message' && item.content) {
            for (const part of item.content) {
              if (part.type === 'audio' && part.transcript) {
                console.log(`🤖 AI Transcript completed: ${part.transcript}`);
                const record = activeCalls.get(callId);
                if (record) {
                  record.transcript.push(`[AI]: ${part.transcript.trim()}`);
                }
              }
            }
          }
          if (item.type === 'function_call') {
            if (item.name === 'append_lead') {
              const { name, phone, email, address, damageType } = JSON.parse(item.arguments);
              console.log(`\n☎️ Lead Captured via Voice!`);
              console.log(`👤 Name: ${name}`);
              console.log(`📞 Phone: ${phone}`);
              console.log(`✉️ Email: ${email}`);
              console.log(`🏠 Address: ${address}`);
              console.log(`💥 Damage: ${damageType}`);

              // Save lead details to call log
              const record = activeCalls.get(callId);
              if (record) {
                record.callerName = name;
                record.callerPhone = phone;
                record.callerEmail = email;
                record.callerAddress = address;
                record.damageType = damageType;

                leadGuard.updateCallLog(callId, {
                  callerName: name,
                  callerPhone: phone,
                  callerEmail: email,
                  callerAddress: address,
                  damageType: damageType
                });
              }

              // Register lead in SQLite Lead Guard duplicate database
              leadGuard.registerClientLead(email, clientId, false, name, damageType);

              const isRealEstate = clientId === 'realestate_nexus';
              const crmName = isRealEstate ? 'KVCore' : (clientId === 'property_apex' ? 'Lofty' : 'KVCore');
              syncToRealEstateCRM({ name, phone, email, address, damageType }, crmName)
                .then(crmRes => {
                  leadGuard.updateCallLog(callId, {
                    agentActivity: `Qualified: ${isRealEstate ? 'Looking for properties' : 'Emergency ' + damageType + ' lead'}. Synced to ${crmName} CRM (ID: ${crmRes.crmLeadId}).`,
                    actionTaken: `[CRM Sync - ${crmName}]`
                  });
                })
                .catch(err => {
                  console.error(`❌ CRM Sync failed:`, err);
                });

              const clientName = CLIENT_CONFIGS[clientId]?.name || 'Syncro Scale Restoration';

              appendLeadToSheet(clientId, { name, phone, email, address, damageType }, 'Active Inbound')
                .then(() => {
                  // Trigger background notifications (Resend Email & Twilio SMS)
                  triggerLeadNotifications(clientId, {
                    name,
                    phone,
                    email,
                    address,
                    damageType,
                    channel: 'Phone Call',
                    clientName
                  });

                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, message: "Lead saved to Google Sheets successfully." })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch((err) => {
                  console.error("❌ Failed to append lead to sheet:", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            } else if (item.name === 'get_available_slots') {
              console.log(`\n📅 Checking Google Calendar available slots...`);
              getAvailableSlots(clientId)
                .then(slots => {
                  console.log(`Available slots:`, slots);
                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, slots })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch(err => {
                  console.error("❌ Failed to fetch available slots:", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            } else if (item.name === 'book_dispatch') {
              const { timeSlot } = JSON.parse(item.arguments);
              console.log(`\n📅 Booking dispatch slot: ${timeSlot}`);
              
              const record = activeCalls.get(callId);
              const activeClientId = record?.clientId || clientId;
              const clientName = CLIENT_CONFIGS[activeClientId]?.name || 'Syncro Scale Restoration';

              const details = {
                name: record?.callerName || 'Unknown Contact',
                phone: record?.callerPhone || '',
                email: record?.callerEmail || '',
                address: record?.callerAddress || 'No Address Provided',
                damageType: record?.damageType || 'Water Damage',
                clientName
              };

              bookDispatch(clientId, timeSlot, details)
                .then(result => {
                  if (record) {
                    record.transcript.push(`[System]: Dispatch booked for ${timeSlot}`);
                    record.dispatchCount = (record.dispatchCount || 0) + 1;
                  }
                  if (activeClientId === 'realestate_nexus') {
                    bookCalendlyAppointment(details, timeSlot)
                      .then(calRes => {
                        leadGuard.updateCallLog(callId, {
                          scheduledDispatch: timeSlot,
                          agentActivity: `Qualified: Looking for ${details.damageType}. Booked Tour on Calendly. URL: ${calRes.eventUrl}`,
                          actionTaken: `[Booked - Calendly]`,
                          dispatchCount: record?.dispatchCount
                        });
                      })
                      .catch(err => console.error("❌ Calendly booking error:", err));
                  } else {
                    createFieldPulseTicket(details)
                      .then(ticketRes => {
                        leadGuard.updateCallLog(callId, {
                          scheduledDispatch: timeSlot,
                          agentActivity: `Scheduled emergency ${details.damageType} crew for ${timeSlot}. FieldPulse Ticket: ${ticketRes.ticketId}`,
                          actionTaken: `[Dispatched - FieldPulse]`,
                          dispatchCount: record?.dispatchCount
                        });
                      })
                      .catch(err => console.error("❌ FieldPulse ticket error:", err));
                  }
                  
                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, message: result.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch(err => {
                  console.error("❌ Failed to book dispatch:", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            }
          }
        }
      }
      
      if (response.type === 'response.output_audio.delta' && response.delta) {
        const record = activeCalls.get(callId);
        if (record) {
          record.buffers.push(Buffer.from(response.delta, 'base64'));
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: "audio_chunk", data: response.delta }));
        }
      }
    } catch (err) { }
  });

  ws.on('close', () => {
    console.log('\n🔌 Browser disconnected.');
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();

    const record = activeCalls.get(callId);
    if (record) {
      const duration = Math.round((Date.now() - record.startTime) / 1000);
      const combinedBuffer = Buffer.concat(record.buffers);
      let recordingPath = '';

      if (combinedBuffer.length > 0) {
        const recordingsDir = path.join(process.cwd(), 'public', 'recordings');
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
        }
        const wavBuffer = pcmToWav(combinedBuffer, 24000, 16, 1);
        const fileName = `${callId}.wav`;
        fs.writeFileSync(path.join(recordingsDir, fileName), wavBuffer);
        recordingPath = `/recordings/${fileName}`;
      }

      leadGuard.updateCallLog(callId, {
        transcript: record.transcript.join('\n'),
        recordingPath: recordingPath,
        duration: duration,
        durationSeconds: duration,
        tokensUsed: record.tokensUsed,
        dispatchCount: record.dispatchCount
      });
      activeCalls.delete(callId);
    }
  });

  openAiWs.on('error', (err) => console.error('❌ OpenAI Error:', err.message));
});

twilioWss.on('connection', (ws: WebSocket, req: any) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const clientId = url.searchParams.get('clientId') || 'default_client';

  console.log(`📞 [Telephony Server] Twilio connected a call. Client: ${clientId}`);
  const callId = `twilio_${Math.random().toString(36).substring(2, 10)}`;

  activeCalls.set(callId, {
    id: callId,
    source: 'telephony',
    buffers: [],
    transcript: [],
    startTime: Date.now(),
    clientId,
    tokensUsed: 0,
    dispatchCount: 0
  });

  leadGuard.createCallLog(callId, 'telephony', clientId);

  const model = "gpt-realtime";
  const openAiWs = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
  );

  let streamSid: string | null = null;

  openAiWs.on('open', () => {
    console.log('🧠 [OpenAI] Connected to Realtime AI Brain for Twilio Call.');
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        output_modalities: ['audio'],
        instructions: getVoiceAgentInstructions(clientId),
        voice: getVoiceAgentVoice(clientId),
        audio: {
          input: {
            format: {
              type: 'audio/pcmu'
            },
            transcription: {
              model: 'whisper-1'
            }
          },
          output: {
            format: {
              type: 'audio/pcmu'
            }
          }
        },
        tools: [
          {
            type: 'function',
            name: 'append_lead',
            description: 'Saves the captured emergency lead details to the Google Sheet database.',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'The contact person\'s full name' },
                phone: { type: 'string', description: 'The contact phone number' },
                email: { type: 'string', description: 'The contact email address' },
                address: { type: 'string', description: 'The property address experiencing damage' },
                damageType: { type: 'string', description: 'Description of the damage type (e.g. water, fire, mold, roof leak)' }
              },
              required: ['name', 'phone', 'email', 'address', 'damageType']
            }
          },
          {
            type: 'function',
            name: 'get_available_slots',
            description: 'Retrieves the list of available emergency dispatch date/time slots for a technician to visit.',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            type: 'function',
            name: 'book_dispatch',
            description: 'Saves the scheduled dispatch appointment slot on the calendar.',
            parameters: {
              type: 'object',
              properties: {
                timeSlot: {
                  type: 'string',
                  description: 'The selected date/time slot exactly as returned by get_available_slots (e.g. "Monday, Jun 15 at 10:00 AM")'
                }
              },
              required: ['timeSlot']
            }
          }
        ],
        tool_choice: 'auto'
      },
    };
    openAiWs.send(JSON.stringify(sessionUpdate));
    console.log('⚡ [OpenAI] Twilio session configuration synced.');
  });

  ws.on('message', (message: any) => {
    try {
      const json = JSON.parse(message.toString());
      if (json.event === 'start') {
        streamSid = json.start.streamSid;
        console.log(`📞 [Telephony] Stream started. Sid: ${streamSid}`);
      } else if (json.event === 'media') {
        if (openAiWs.readyState === WebSocket.OPEN) {
          openAiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: json.media.payload
          }));
        }

        const record = activeCalls.get(callId);
        if (record) {
          record.buffers.push(Buffer.from(json.media.payload, 'base64'));
        }
      }
    } catch (err) {
      console.error('❌ Twilio message parse error:', err);
    }
  });

  openAiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      
      if (response.type === 'session.created' || response.type === 'session.updated') {
        console.log(`🤖 [OpenAI Event] ${response.type} (Twilio):`, JSON.stringify(response.session, null, 2));
      } else {
        console.log('🤖 [OpenAI Event] (Twilio):', response.type);
      }

      if (response.type === 'error') {
        console.error('❌ OpenAI Twilio Error Event:', JSON.stringify(response.error, null, 2));
      }

      if (response.type === 'response.output_audio_transcript.delta' && response.delta) {
        process.stdout.write(response.delta);
      }

      if (response.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('\n📝 User Utterance (Twilio):', response.transcript);
        const record = activeCalls.get(callId);
        if (record && response.transcript) {
          record.transcript.push(`[User]: ${response.transcript.trim()}`);
          
          // Inject matching RAG context dynamically into the voice session
          retrieveContext(clientId, response.transcript)
            .then(context => {
              if (context && openAiWs.readyState === WebSocket.OPEN) {
                console.log(`🧠 [RAG Voice Twilio] Injecting dynamic system context: ${context.substring(0, 60)}...`);
                openAiWs.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'message',
                    role: 'system',
                    content: [
                      {
                        type: 'input_text',
                        text: `The following is relevant facts context from the client's knowledge base:\n${context}`
                      }
                    ]
                  }
                }));
              }
            })
            .catch(err => console.error("❌ RAG Twilio context fetch error:", err));
        }
      }

      // Handle speech interruption (VAD)
      if (response.type === 'input_audio_buffer.speech_started') {
        console.log('🎙️ [Telephony] Interruption detected. Clearing Twilio buffer...');
        // Cancel OpenAI generation
        openAiWs.send(JSON.stringify({ type: 'response.cancel' }));
        // Clear Twilio buffer
        if (streamSid && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            event: 'clear',
            streamSid: streamSid
          }));
        }
      }

      if (response.type === 'response.done') {
        const usage = response.response?.usage;
        if (usage) {
          const record = activeCalls.get(callId);
          if (record) {
            record.tokensUsed = (record.tokensUsed || 0) + (usage.total_tokens || 0);
            leadGuard.updateCallLog(callId, { tokensUsed: record.tokensUsed });
          }
        }
        const outputItems = response.response?.output || [];
        for (const item of outputItems) {
          if (item.type === 'message' && item.content) {
            for (const part of item.content) {
              if (part.type === 'audio' && part.transcript) {
                console.log(`🤖 AI Transcript completed (Twilio): ${part.transcript}`);
                const record = activeCalls.get(callId);
                if (record) {
                  record.transcript.push(`[AI]: ${part.transcript.trim()}`);
                }
              }
            }
          }
          if (item.type === 'function_call') {
            if (item.name === 'append_lead') {
              const { name, phone, email, address, damageType } = JSON.parse(item.arguments);
              console.log(`\n☎️ Lead Captured via Twilio Call!`);
              console.log(`👤 Name: ${name}`);
              console.log(`📞 Phone: ${phone}`);
              console.log(`✉️ Email: ${email}`);
              console.log(`🏠 Address: ${address}`);
              console.log(`💥 Damage: ${damageType}`);

              // Save lead details to call log
              const record = activeCalls.get(callId);
              if (record) {
                record.callerName = name;
                record.callerPhone = phone;
                record.callerEmail = email;
                record.callerAddress = address;
                record.damageType = damageType;

                leadGuard.updateCallLog(callId, {
                  callerName: name,
                  callerPhone: phone,
                  callerEmail: email,
                  callerAddress: address,
                  damageType: damageType
                });
              }

              // Register lead in SQLite Lead Guard duplicate database
              leadGuard.registerClientLead(email, clientId, false, name, damageType);

              const isRealEstate = clientId === 'realestate_nexus';
              const crmName = isRealEstate ? 'KVCore' : (clientId === 'property_apex' ? 'Lofty' : 'KVCore');
              syncToRealEstateCRM({ name, phone, email, address, damageType }, crmName)
                .then(crmRes => {
                  leadGuard.updateCallLog(callId, {
                    agentActivity: `Qualified: ${isRealEstate ? 'Looking for properties' : 'Emergency ' + damageType + ' lead'}. Synced to ${crmName} CRM (ID: ${crmRes.crmLeadId}).`,
                    actionTaken: `[CRM Sync - ${crmName}]`
                  });
                })
                .catch(err => {
                  console.error(`❌ CRM Sync failed (Twilio):`, err);
                });

              const clientName = CLIENT_CONFIGS[clientId]?.name || 'Syncro Scale Restoration';

              appendLeadToSheet(clientId, { name, phone, email, address, damageType }, 'Active Inbound')
                .then(() => {
                  // Trigger background notifications (Resend Email & Twilio SMS)
                  triggerLeadNotifications(clientId, {
                    name,
                    phone,
                    email,
                    address,
                    damageType,
                    channel: 'Phone Call',
                    clientName
                  });

                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, message: "Lead saved to Google Sheets successfully." })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch((err) => {
                  console.error("❌ Failed to append Twilio lead to sheet:", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            } else if (item.name === 'get_available_slots') {
              console.log(`\n📅 Checking Google Calendar available slots (Twilio)...`);
              getAvailableSlots(clientId)
                .then(slots => {
                  console.log(`Available slots:`, slots);
                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, slots })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch(err => {
                  console.error("❌ Failed to fetch available slots (Twilio):", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            } else if (item.name === 'book_dispatch') {
              const { timeSlot } = JSON.parse(item.arguments);
              console.log(`\n📅 Booking dispatch slot (Twilio): ${timeSlot}`);
              
              const record = activeCalls.get(callId);
              const activeClientId = record?.clientId || clientId;
              const clientName = CLIENT_CONFIGS[activeClientId]?.name || 'Syncro Scale Restoration';

              const details = {
                name: record?.callerName || 'Unknown Contact',
                phone: record?.callerPhone || '',
                email: record?.callerEmail || '',
                address: record?.callerAddress || 'No Address Provided',
                damageType: record?.damageType || 'Water Damage',
                clientName
              };

              bookDispatch(clientId, timeSlot, details)
                .then(result => {
                  if (record) {
                    record.transcript.push(`[System]: Dispatch booked for ${timeSlot}`);
                    record.dispatchCount = (record.dispatchCount || 0) + 1;
                  }
                  if (activeClientId === 'realestate_nexus') {
                    bookCalendlyAppointment(details, timeSlot)
                      .then(calRes => {
                        leadGuard.updateCallLog(callId, {
                          scheduledDispatch: timeSlot,
                          agentActivity: `Qualified: Looking for ${details.damageType}. Booked Tour on Calendly. URL: ${calRes.eventUrl}`,
                          actionTaken: `[Booked - Calendly]`,
                          dispatchCount: record?.dispatchCount
                        });
                      })
                      .catch(err => console.error("❌ Calendly booking error (Twilio):", err));
                  } else {
                    createFieldPulseTicket(details)
                      .then(ticketRes => {
                        leadGuard.updateCallLog(callId, {
                          scheduledDispatch: timeSlot,
                          agentActivity: `Scheduled emergency ${details.damageType} crew for ${timeSlot}. FieldPulse Ticket: ${ticketRes.ticketId}`,
                          actionTaken: `[Dispatched - FieldPulse]`,
                          dispatchCount: record?.dispatchCount
                        });
                      })
                      .catch(err => console.error("❌ FieldPulse ticket error (Twilio):", err));
                  }
                  
                  const outputEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: true, message: result.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(outputEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                })
                .catch(err => {
                  console.error("❌ Failed to book dispatch (Twilio):", err);
                  const errorEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: item.call_id,
                      output: JSON.stringify({ success: false, error: err.message })
                    }
                  };
                  if (openAiWs.readyState === WebSocket.OPEN) {
                    openAiWs.send(JSON.stringify(errorEvent));
                    openAiWs.send(JSON.stringify({ type: 'response.create' }));
                  }
                });
            }
          }
        }
      }

      if (response.type === 'response.output_audio.delta' && response.delta) {
        const record = activeCalls.get(callId);
        if (record) {
          record.buffers.push(Buffer.from(response.delta, 'base64'));
        }
        if (streamSid && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: response.delta
            }
          }));
        }
      }
    } catch (err) {}
  });

  ws.on('close', () => {
    console.log('\n🔌 Twilio call disconnected.');
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();

    const record = activeCalls.get(callId);
    if (record) {
      const duration = Math.round((Date.now() - record.startTime) / 1000);
      const combinedBuffer = Buffer.concat(record.buffers);
      let recordingPath = '';

      if (combinedBuffer.length > 0) {
        const recordingsDir = path.join(process.cwd(), 'public', 'recordings');
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
        }
        const wavBuffer = pcmToWav(combinedBuffer, 8000, 8, 7);
        const fileName = `${callId}.wav`;
        fs.writeFileSync(path.join(recordingsDir, fileName), wavBuffer);
        recordingPath = `/recordings/${fileName}`;
      }

      leadGuard.updateCallLog(callId, {
        transcript: record.transcript.join('\n'),
        recordingPath: recordingPath,
        duration: duration,
        durationSeconds: duration,
        tokensUsed: record.tokensUsed,
        dispatchCount: record.dispatchCount
      });
      activeCalls.delete(callId);
    }
  });

  openAiWs.on('error', (err) => console.error('❌ OpenAI Twilio Error:', err.message));
});

// --- WebSocket Chat Ingest Engine ---
chatWss.on('connection', (ws: WebSocket, req: any) => {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const clientId = url.searchParams.get('clientId') || 'default_client';

  console.log(`💬 [Chat Server] Client connected. Client: ${clientId}`);
  const callId = `chat_${Math.random().toString(36).substring(2, 10)}`;

  activeCalls.set(callId, {
    id: callId,
    source: 'web_chat',
    buffers: [],
    transcript: [],
    startTime: Date.now(),
    clientId,
    tokensUsed: 0,
    dispatchCount: 0
  });

  leadGuard.createCallLog(callId, 'web_chat', clientId);

  const config = CLIENT_CONFIGS[clientId] || CLIENT_CONFIGS.default_client;

  const messages: any[] = [
    { role: 'system', content: getChatAgentInstructions(clientId) },
    { role: 'assistant', content: config.chatGreeting }
  ];

  // Send greeting message immediately
  ws.send(JSON.stringify({ event: 'text_chunk', text: config.chatGreeting }));
  ws.send(JSON.stringify({ event: 'response_done' }));
  
  const record = activeCalls.get(callId);
  if (record) {
    record.transcript.push(`[AI]: ${config.chatGreeting}`);
  }

  ws.on('message', async (message: any) => {
    try {
      const json = JSON.parse(message.toString());
      if (json.event === 'user_message' && json.text) {
        console.log(`📝 Chat User [${callId}]:`, json.text);
        const record = activeCalls.get(callId);
        if (record) {
          record.transcript.push(`[User]: ${json.text.trim()}`);
        }
        
        messages.push({ role: 'user', content: json.text });
        
        await handleChatCompletion(ws, callId, clientId, messages);
      }
    } catch (err: any) {
      console.error('❌ Chat message error:', err);
      ws.send(JSON.stringify({ event: 'error', message: 'Error processing message' }));
    }
  });

  ws.on('close', () => {
    console.log(`\n🔌 Chat client disconnected: ${callId}`);
    const record = activeCalls.get(callId);
    if (record) {
      const duration = Math.round((Date.now() - record.startTime) / 1000);
      leadGuard.updateCallLog(callId, {
        transcript: record.transcript.join('\n'),
        duration: duration,
        durationSeconds: duration,
        tokensUsed: record.tokensUsed,
        dispatchCount: record.dispatchCount
      });
      activeCalls.delete(callId);
    }
  });
});

async function handleChatCompletion(ws: WebSocket, callId: string, clientId: string, messages: any[]) {
  try {
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'append_lead',
          description: 'Saves the captured emergency lead details to the Google Sheet database.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The contact person\'s full name' },
              phone: { type: 'string', description: 'The contact phone number' },
              email: { type: 'string', description: 'The contact email address' },
              address: { type: 'string', description: 'The property address experiencing damage' },
              damageType: { type: 'string', description: 'Description of the damage type (e.g. water, fire, mold, roof leak)' }
            },
            required: ['name', 'phone', 'email', 'address', 'damageType']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_available_slots',
          description: 'Retrieves the list of available emergency dispatch date/time slots for a technician to visit.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_dispatch',
          description: 'Saves the scheduled dispatch appointment slot on the calendar.',
          parameters: {
            type: 'object',
            properties: {
              timeSlot: {
                type: 'string',
                description: 'The selected date/time slot exactly as returned by get_available_slots (e.g. "Monday, Jun 15 at 10:00 AM")'
              }
            },
            required: ['timeSlot']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'show_listings',
          description: 'Presents a list of active property listings matching neighborhood and max price criteria to the user.',
          parameters: {
            type: 'object',
            properties: {
              neighborhood: { type: 'string', description: 'The neighborhood name (e.g. Summerlin, Henderson, Las Vegas)' },
              maxPrice: { type: 'number', description: 'Maximum price limit in USD' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'show_pricing_guide',
          description: 'Displays a detailed, formatted pricing card and rate sheet for emergency restoration/roofing services.',
          parameters: {
            type: 'object',
            properties: {
              serviceType: { type: 'string', description: 'The service type (e.g. water, fire, mold, roofing)' }
            }
          }
        }
      }
    ];

    // Find the latest user message
    let lastUserMessage = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content || "";
        break;
      }
    }

    const openAiMessages = [...messages];
    if (lastUserMessage) {
      const context = await retrieveContext(clientId, lastUserMessage);
      if (context) {
        openAiMessages.push({
          role: 'system',
          content: `The following is relevant facts context from the client's knowledge base:\n${context}\nUse this context to answer the user's question accurately. Do not cite the similarity percentage to the user.`
        });
      }
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openAiMessages,
      tools,
      tool_choice: 'auto',
      stream: true,
      stream_options: { include_usage: true }
    });

    let fullContent = '';
    let toolCalls: any[] = [];

    for await (const chunk of stream) {
      if (chunk.usage) {
        const record = activeCalls.get(callId);
        if (record) {
          record.tokensUsed = (record.tokensUsed || 0) + (chunk.usage.total_tokens || 0);
          leadGuard.updateCallLog(callId, { tokensUsed: record.tokensUsed });
        }
      }
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (delta.content) {
        fullContent += delta.content;
        ws.send(JSON.stringify({ event: 'text_chunk', text: delta.content }));
      }

      if (delta.tool_calls) {
        for (const tcChunk of delta.tool_calls) {
          if (!toolCalls[tcChunk.index]) {
            toolCalls[tcChunk.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          }
          const tc = toolCalls[tcChunk.index];
          if (tcChunk.id) tc.id = tcChunk.id;
          if (tcChunk.function?.name) tc.function.name = tcChunk.function.name;
          if (tcChunk.function?.arguments) tc.function.arguments += tcChunk.function.arguments;
        }
      }
    }

    const finalToolCalls = toolCalls.filter(Boolean);

    if (fullContent) {
      messages.push({ role: 'assistant', content: fullContent });
      const record = activeCalls.get(callId);
      if (record) {
        record.transcript.push(`[AI]: ${fullContent.trim()}`);
      }
    }

    if (finalToolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: finalToolCalls
      });

      for (const toolCall of finalToolCalls) {
        const funcName = toolCall.function.name;
        const args = toolCall.function.arguments;
        const parsedArgs = JSON.parse(args);

        if (funcName === 'append_lead') {
          const { name, phone, email, address, damageType } = parsedArgs;
          ws.send(JSON.stringify({ event: 'status_update', text: 'Saving lead details...' }));

          const record = activeCalls.get(callId);
          if (record) {
            record.callerName = name;
            record.callerPhone = phone;
            record.callerEmail = email;
            record.callerAddress = address;
            record.damageType = damageType;

            leadGuard.updateCallLog(callId, {
              callerName: name,
              callerPhone: phone,
              callerEmail: email,
              callerAddress: address,
              damageType: damageType
            });
          }

          leadGuard.registerClientLead(email, clientId, false, name, damageType);
          const clientName = CLIENT_CONFIGS[clientId]?.name || 'Syncro Scale Restoration';

          const isRealEstate = clientId === 'realestate_nexus';
          const crmName = isRealEstate ? 'KVCore' : (clientId === 'property_apex' ? 'Lofty' : 'KVCore');

          const crmRes = await syncToRealEstateCRM({ name, phone, email, address, damageType }, crmName);
          leadGuard.updateCallLog(callId, {
            agentActivity: `Qualified: ${isRealEstate ? 'Looking for properties' : 'Emergency ' + damageType + ' lead'}. Synced to ${crmName} CRM (ID: ${crmRes.crmLeadId}).`,
            actionTaken: `[CRM Sync - ${crmName}]`
          });

          await appendLeadToSheet(clientId, { name, phone, email, address, damageType }, 'Active Inbound');

          triggerLeadNotifications(clientId, {
            name,
            phone,
            email,
            address,
            damageType,
            channel: 'Web Chat',
            clientName
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: funcName,
            content: JSON.stringify({ success: true, message: `Lead saved to Google Sheets and synced to ${crmName} CRM.` })
          });

        } else if (funcName === 'get_available_slots') {
          ws.send(JSON.stringify({ event: 'status_update', text: 'Checking available slots...' }));
          const slots = await getAvailableSlots(clientId);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: funcName,
            content: JSON.stringify({ success: true, slots })
          });

        } else if (funcName === 'book_dispatch') {
          const { timeSlot } = parsedArgs;
          ws.send(JSON.stringify({ event: 'status_update', text: `Scheduling appointment for ${timeSlot}...` }));

          const record = activeCalls.get(callId);
          const activeClientId = record?.clientId || clientId;
          const clientName = CLIENT_CONFIGS[activeClientId]?.name || 'Syncro Scale Restoration';

          const details = {
            name: record?.callerName || 'Unknown Contact',
            phone: record?.callerPhone || '',
            email: record?.callerEmail || '',
            address: record?.callerAddress || 'No Address Provided',
            damageType: record?.damageType || 'Water Damage',
            clientName
          };

          const result = await bookDispatch(clientId, timeSlot, details);

          if (record) {
            record.transcript.push(`[System]: Dispatch booked for ${timeSlot}`);
            record.dispatchCount = (record.dispatchCount || 0) + 1;
          }

          if (clientId === 'realestate_nexus') {
            const calRes = await bookCalendlyAppointment(details, timeSlot);
            leadGuard.updateCallLog(callId, {
              scheduledDispatch: timeSlot,
              agentActivity: `Qualified: Looking for ${details.damageType}. Booked Tour on Calendly. URL: ${calRes.eventUrl}`,
              actionTaken: `[Booked - Calendly]`,
              dispatchCount: record?.dispatchCount
            });
          } else {
            const ticketRes = await createFieldPulseTicket(details);
            leadGuard.updateCallLog(callId, {
              scheduledDispatch: timeSlot,
              agentActivity: `Scheduled emergency ${details.damageType} crew for ${timeSlot}. FieldPulse Ticket: ${ticketRes.ticketId}`,
              actionTaken: `[Dispatched - FieldPulse]`,
              dispatchCount: record?.dispatchCount
            });
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: funcName,
            content: JSON.stringify({ success: true, message: result.message })
          });
        } else if (funcName === 'show_listings') {
          const { neighborhood, maxPrice } = parsedArgs;
          ws.send(JSON.stringify({ event: 'status_update', text: 'Retrieving active property listings...' }));
          
          const mockListings = [
            {
              id: "listing_1",
              title: "Modern Summerlin Estate",
              price: 850000,
              priceStr: "$850,000",
              beds: 4,
              baths: 3,
              sqft: 2800,
              address: "104 Sky Vista Dr, Summerlin NV",
              neighborhood: "Summerlin",
              imageGradient: "linear-gradient(135deg, #1e1b4b, #311042)"
            },
            {
              id: "listing_2",
              title: "Sleek High-Rise Condo",
              price: 620000,
              priceStr: "$620,000",
              beds: 2,
              baths: 2,
              sqft: 1450,
              address: "2000 Las Vegas Blvd S #1402, Las Vegas NV",
              neighborhood: "Las Vegas",
              imageGradient: "linear-gradient(135deg, #0f172a, #1e1b4b)"
            },
            {
              id: "listing_3",
              title: "Henderson Family Residence",
              price: 495000,
              priceStr: "$495,000",
              beds: 3,
              baths: 2,
              sqft: 1950,
              address: "882 Green Valley Pkwy, Henderson NV",
              neighborhood: "Henderson",
              imageGradient: "linear-gradient(135deg, #022c22, #0f172a)"
            },
            {
              id: "listing_4",
              title: "Summerlin Luxury Villa",
              price: 1250000,
              priceStr: "$1,250,000",
              beds: 5,
              baths: 5,
              sqft: 4200,
              address: "410 Canyon Edge Ct, Summerlin NV",
              neighborhood: "Summerlin",
              imageGradient: "linear-gradient(135deg, #311042, #581c87)"
            },
            {
              id: "listing_5",
              title: "Cozy Henderson Townhome",
              price: 380000,
              priceStr: "$380,000",
              beds: 2,
              baths: 2.5,
              sqft: 1350,
              address: "120 Windmill Lane, Henderson NV",
              neighborhood: "Henderson",
              imageGradient: "linear-gradient(135deg, #111827, #030712)"
            }
          ];

          let filtered = [...mockListings];
          if (neighborhood) {
            filtered = filtered.filter(l => l.neighborhood.toLowerCase().includes(neighborhood.toLowerCase()));
          }
          if (maxPrice) {
            filtered = filtered.filter(l => l.price <= maxPrice);
          }

          if (filtered.length === 0) {
            filtered = mockListings.slice(0, 3);
          }

          ws.send(JSON.stringify({
            event: 'rich_card',
            cardType: 'property_carousel',
            data: filtered
          }));

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: funcName,
            content: JSON.stringify({ success: true, count: filtered.length, message: `Displayed property carousel with ${filtered.length} listings to the user.` })
          });

        } else if (funcName === 'show_pricing_guide') {
          ws.send(JSON.stringify({ event: 'status_update', text: 'Generating service pricing details...' }));
          
          let pricingData: any = {};
          
          if (clientId === 'restoration_lv') {
            pricingData = {
              title: "Restoration Pro Las Vegas Rate Sheet",
              rates: [
                { service: "Emergency Water Extraction", rate: "$150 / hr", unit: "Hour" },
                { service: "Structural Dehumidification", rate: "$95 / day", unit: "Day" },
                { service: "Thermal Moisture Scan", rate: "Included", unit: "Flat" },
                { service: "Mold Remediation Containment", rate: "$450 flat", unit: "Flat" },
                { service: "Fire/Soot Structural Cleaning", rate: "$250 flat", unit: "Flat" }
              ],
              billingNotice: "Direct Insurance Billing. We coordinate directly with all major insurance carriers so you have no out-of-pocket stress."
            };
          } else if (clientId === 'roofing_sc') {
            pricingData = {
              title: "Sin City Roof Crew Pricing Guide",
              rates: [
                { service: "Emergency Tarping Response", rate: "$250 flat", unit: "Flat" },
                { service: "Roof Leak Inspection & Drone Scan", rate: "$120 flat", unit: "Flat" },
                { service: "Shingle Repair / Patchwork", rate: "$75 / hr", unit: "Hour" },
                { service: "Full Roof Inspection Report", rate: "Included", unit: "Flat" }
              ],
              billingNotice: "Licensed NV Roofers. We provide comprehensive photos and damage estimates for insurance adjusters."
            };
          } else {
            pricingData = {
              title: "General Service Rate Card",
              rates: [
                { service: "Emergency Technician Dispatch", rate: "$120 flat", unit: "Flat" },
                { service: "Hourly Repair Services", rate: "$85 / hr", unit: "Hour" },
                { service: "Inspection / Damage Appraisal", rate: "Included", unit: "Flat" }
              ],
              billingNotice: "Standard pricing applies. We provide a detailed estimate before any work commences."
            };
          }

          ws.send(JSON.stringify({
            event: 'rich_card',
            cardType: 'pricing_table',
            data: pricingData
          }));

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: funcName,
            content: JSON.stringify({ success: true, message: `Displayed pricing card to the user.` })
          });
        }
      }

      await handleChatCompletion(ws, callId, clientId, messages);
    } else {
      ws.send(JSON.stringify({ event: 'response_done' }));
    }
  } catch (err: any) {
    console.error('❌ Error in chat completions:', err);
    ws.send(JSON.stringify({ event: 'error', message: err.message }));
  }
}

const activeSessions = new Map<string, { clientId: string; expiresAt: number }>();

function verifySessionToken(req: any, res: any, next: any) {
  if (req.path === '/auth/login' || req.path === '/web-lead' || req.path === '/webhooks/meta-lead') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = activeSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid' });
  }

  session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;

  // Tenant Scope Enforcement
  const requestedClient = (req.query.clientId || req.body.clientId) as string | undefined;
  if (requestedClient) {
    const cleanRequested = requestedClient.toLowerCase().trim();
    if (session.clientId !== 'admin' && session.clientId !== cleanRequested) {
      return res.status(403).json({ success: false, error: 'Forbidden: Tenant scope mismatch' });
    }
  }

  req.session = session;
  next();
}

app.use('/api', verifySessionToken);

app.post('/api/auth/login', (req, res) => {
  try {
    const { clientId, password } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }
    const isValid = leadGuard.verifyClientCredentials(clientId, password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid Account ID or password' });
    }

    const token = globalThis.crypto.randomUUID();
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    activeSessions.set(token, {
      clientId: clientId.toLowerCase().trim(),
      expiresAt
    });

    res.status(200).json({
      success: true,
      token,
      clientId: clientId.toLowerCase().trim(),
      name: clientId === 'admin' ? 'System Administrator' : (leadGuard.getClientSettings(clientId)?.name || clientId)
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST endpoint for web lead ingestion
app.post('/api/web-lead', async (req, res) => {
  console.log('📥 Received web lead payload:', req.body);
  const clientId = req.body.clientId || req.query.clientId || 'default_client';
  
  const name = req.body.name ? req.body.name.trim() : '';
  const email = req.body.email ? req.body.email.trim() : '';
  const phone = req.body.phone ? req.body.phone.trim() : 'N/A';
  const address = req.body.address ? req.body.address.trim() : 'N/A';
  const damageType = req.body.damageType ? req.body.damageType.trim() : 'N/A';

  if (!name || !email) {
    console.warn('⚠️ Web lead ingestion rejected: Missing required name or email fields.');
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }

  try {
    await appendLeadToSheet(clientId, { name, phone, email, address, damageType }, 'Active Inbound');
    
    const clientName = CLIENT_CONFIGS[clientId]?.name || 'Syncro Scale Restoration';
    
    // Trigger background notifications (Resend Email & Twilio SMS)
    triggerLeadNotifications(clientId, {
      name,
      phone,
      email,
      address,
      damageType,
      channel: 'Web Form',
      clientName
    });

    res.status(200).json({ success: true, message: 'Lead saved to Google Sheets successfully.' });
  } catch (error: any) {
    console.error('❌ Failed to process web lead ingestion:', error);
    res.status(500).json({ success: false, error: 'Internal server error saving lead.', details: error.message });
  }
});

// --- RAG Knowledge Base API Endpoints ---
app.post('/api/knowledge/upload', async (req, res) => {
  try {
    const { clientId, filename, content } = req.body;
    if (!clientId || !filename || !content) {
      return res.status(400).json({ success: false, error: 'clientId, filename, and content are required' });
    }

    console.log(`📥 [RAG Upload] Chunking and embedding file "${filename}" for client "${clientId}"`);
    
    // 1. Chunk text
    const chunks = chunkText(content, 600, 100);
    
    // 2. Generate embedding and insert for each chunk
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      leadGuard.insertKnowledgeChunk(clientId, filename, chunk, embedding);
    }

    console.log(`✅ [RAG Upload] Successfully uploaded ${chunks.length} chunks for "${filename}"`);
    res.status(200).json({ success: true, chunkCount: chunks.length });
  } catch (error: any) {
    console.error('❌ Failed to process knowledge upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/knowledge/files', async (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId parameter is required' });
    }
    const files = leadGuard.getKnowledgeBaseFiles(clientId);
    res.status(200).json({ success: true, files });
  } catch (error: any) {
    console.error('❌ Failed to fetch files list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/knowledge/files', async (req, res) => {
  try {
    const { clientId, filename } = req.body;
    if (!clientId || !filename) {
      return res.status(400).json({ success: false, error: 'clientId and filename are required' });
    }
    leadGuard.deleteKnowledgeBaseFile(clientId, filename);
    console.log(`🧹 [RAG Delete] Removed knowledge base file "${filename}" for client "${clientId}"`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to delete knowledge base file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/knowledge/query', async (req, res) => {
  try {
    const { clientId, query } = req.body;
    if (!clientId || !query) {
      return res.status(400).json({ success: false, error: 'clientId and query are required' });
    }
    const t0 = Date.now();
    const matches = await queryRAG(clientId, query, 5);
    const latency = Date.now() - t0;
    res.status(200).json({ success: true, matches, latencyMs: latency });
  } catch (error: any) {
    console.error('❌ RAG sandbox query failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Dashboard API Endpoints ---
// leadGuard is initialized at the top level

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const stats = leadGuard.getStats(clientId);
    const intakeDir = path.join(process.cwd(), 'intake');
    let pendingCsvs = 0;
    if (fs.existsSync(intakeDir)) {
      pendingCsvs = fs.readdirSync(intakeDir).filter(f => f.endsWith('.csv')).length;
    }
    
    res.status(200).json({
      success: true,
      stats: {
        totalLeads: stats.totalLeads,
        globalBlocks: stats.globalBlocks,
        totalCalls: stats.totalCalls,
        scheduledDispatches: stats.scheduledDispatches,
        outreachDispatched: stats.outreachDispatched,
        damageTypes: stats.damageTypes,
        pendingCsvs
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/analytics-data', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const data = leadGuard.getAnalyticsData(clientId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Failed to fetch analytics data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/leads-registry', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const leads = leadGuard.getAllRegisteredLeads(clientId);
    res.status(200).json({ success: true, leads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/call-logs', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const logs = leadGuard.getAllCallLogs(clientId);
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/dashboard-billing', async (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const logs = leadGuard.getAllCallLogs(clientId);

    // Rates constants
    const VOICE_MINUTE_RATE = 0.15;
    const VOICE_SECOND_RATE = VOICE_MINUTE_RATE / 60; // $0.0025
    const TOKEN_RATE = 0.00003; // $30 per million tokens
    const DISPATCH_RATE = 10.00;

    let totalDurationSeconds = 0;
    let totalVoiceDurationSeconds = 0;
    let totalTokens = 0;
    let totalDispatches = 0;

    const formattedSessions = logs.map(log => {
      const isVoice = log.source === 'browser' || log.source === 'telephony';
      const durationSec = log.duration_seconds || log.duration || 0;
      const tokens = log.tokens_used || 0;
      const dispatches = log.dispatch_count || 0;

      totalDurationSeconds += durationSec;
      if (isVoice) {
        totalVoiceDurationSeconds += durationSec;
      }
      totalTokens += tokens;
      totalDispatches += dispatches;

      // compute simulated cost for this session
      const voiceCost = isVoice ? durationSec * VOICE_SECOND_RATE : 0;
      const tokenCost = tokens * TOKEN_RATE;
      const dispatchCost = dispatches * DISPATCH_RATE;
      const sessionCost = voiceCost + tokenCost + dispatchCost;

      return {
        id: log.id,
        clientId: log.client_id,
        source: log.source,
        callerName: log.caller_name || 'Unknown Contact',
        startedAt: log.started_at,
        durationSeconds: durationSec,
        tokensUsed: tokens,
        dispatchCount: dispatches,
        cost: Number(sessionCost.toFixed(4))
      };
    });

    const voiceCostTotal = totalVoiceDurationSeconds * VOICE_SECOND_RATE;
    const tokenCostTotal = totalTokens * TOKEN_RATE;
    const dispatchCostTotal = totalDispatches * DISPATCH_RATE;
    const grandTotal = voiceCostTotal + tokenCostTotal + dispatchCostTotal;

    let stripeStatus = 'inactive';
    let stripeCustomerId = '';
    let cardBrand = '';
    let cardLast4 = '';
    let historicalInvoices: any[] = [];

    if (clientId && clientId !== 'all') {
      const dbSettings = leadGuard.getClientSettings(clientId);
      if (dbSettings) {
        stripeStatus = dbSettings.subscriptionStatus || 'inactive';
        stripeCustomerId = dbSettings.stripeCustomerId || '';
        cardBrand = dbSettings.stripeCardBrand || '';
        cardLast4 = dbSettings.stripeCardLast4 || '';
      }
      historicalInvoices = leadGuard.getInvoices(clientId);
    }

    res.status(200).json({
      success: true,
      billing: {
        totalCalls: logs.length,
        totalDurationSeconds,
        totalVoiceDurationSeconds,
        totalTokens,
        totalDispatches,
        rates: {
          voiceMinute: VOICE_MINUTE_RATE,
          token: TOKEN_RATE,
          dispatch: DISPATCH_RATE
        },
        costs: {
          voice: Number(voiceCostTotal.toFixed(2)),
          tokens: Number(tokenCostTotal.toFixed(2)),
          dispatches: Number(dispatchCostTotal.toFixed(2)),
          total: Number(grandTotal.toFixed(2))
        },
        sessions: formattedSessions,
        stripe: {
          status: stripeStatus,
          customerId: stripeCustomerId,
          cardBrand,
          cardLast4,
          invoices: historicalInvoices
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/simulate-call-log', async (req, res) => {
  try {
    const { clientId } = req.body;
    const cid = clientId || 'restoration_lv';
    const names = ['Michael Scott', 'Jim Halpert', 'Pam Beesly', 'Dwight Schrute', 'Creed Bratton'];
    const callerName = names[Math.floor(Math.random() * names.length)];
    const duration = Math.floor(Math.random() * 180) + 30; // 30s to 210s
    const tokens = Math.floor(Math.random() * 4000) + 800; // 800 to 4800 tokens
    const dispatch = Math.random() > 0.6 ? 1 : 0;

    leadGuard.simulateCallLog(cid, callerName, duration, tokens, dispatch);

    res.status(200).json({ success: true, message: 'Mock call log simulated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clear-registry', async (req, res) => {
  try {
    leadGuard.clearRegistry();
    res.status(200).json({ success: true, message: 'Lead duplicate registry and call logs cleared.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/client-settings', (req, res) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId parameter is required' });
    }
    const settings = leadGuard.getClientSettings(clientId);
    if (!settings) {
      const fallback = HARDCODED_CLIENT_CONFIGS[clientId] || HARDCODED_CLIENT_CONFIGS.default_client;
      const defaultsMap: Record<string, any> = {
        restoration_lv: {
          primaryColor: "hsl(14, 90%, 55%)", primaryHover: "hsl(14, 90%, 48%)", primaryGlow: "rgba(239, 68, 68, 0.15)",
          secondaryColor: "hsl(210, 90%, 60%)", secondaryHover: "hsl(210, 90%, 52%)", secondaryGlow: "rgba(59, 130, 246, 0.15)",
          bgPrimary: "#0a0808", bgSecondary: "#130f0f", heroTitle: "Water or Fire Damage?<br><span class=\"text-glow\">Las Vegas Pro Team On Site.</span>",
          subtitle: "Fast, certified mitigation and structural restoration. We process direct insurance billing to safeguard your Las Vegas property.",
          logo: "Restoration Pro Las Vegas", phone: "📞 Urgent: Call (702) 555-0100"
        },
        roofing_sc: {
          primaryColor: "hsl(190, 95%, 50%)", primaryHover: "hsl(190, 95%, 43%)", primaryGlow: "rgba(6, 182, 212, 0.15)",
          secondaryColor: "hsl(280, 85%, 60%)", secondaryHover: "hsl(280, 85%, 52%)", secondaryGlow: "rgba(168, 85, 247, 0.15)",
          bgPrimary: "#050811", bgSecondary: "#0a1122", heroTitle: "Emergency Roof Leak?<br><span class=\"text-glow\">Tarping & Repair Crews Ready.</span>",
          subtitle: "Fast, specialized storm damage responses, structural roof inspections, and leak mitigation. We protect your Sin City home.",
          logo: "Sin City Roof Crew", phone: "📞 Emergency Tarping: Call (702) 555-0200"
        },
        property_apex: {
          primaryColor: "hsl(150, 85%, 45%)", primaryHover: "hsl(150, 85%, 38%)", primaryGlow: "rgba(16, 185, 129, 0.15)",
          secondaryColor: "hsl(45, 95%, 55%)", secondaryHover: "hsl(45, 95%, 48%)", secondaryGlow: "rgba(234, 179, 8, 0.15)",
          bgPrimary: "#060a08", bgSecondary: "#0e1612", heroTitle: "Tenant Maintenance Emergency?<br><span class=\"text-glow\">Rapid Resolution & Repair.</span>",
          subtitle: "24/7 central repair line for Apex managed tenants. Submit your repair request below to dispatch a maintenance technician.",
          logo: "Apex Property Management", phone: "📞 Maintenance: Call (702) 555-0300"
        },
        realestate_nexus: {
          primaryColor: "hsl(270, 80%, 55%)", primaryHover: "hsl(270, 80%, 48%)", primaryGlow: "rgba(168, 85, 247, 0.15)",
          secondaryColor: "hsl(160, 85%, 45%)", secondaryHover: "hsl(160, 85%, 38%)", secondaryGlow: "rgba(16, 185, 129, 0.15)",
          bgPrimary: "#07050a", bgSecondary: "#100d16", heroTitle: "Find Your Dream Home.<br><span class=\"text-glow\">Nexus Realty Group Virtual Showings.</span>",
          subtitle: "Elite residential sales, leasing, and immersive virtual tours. Book your showing below and let us guide you home.",
          logo: "Nexus Realty Group", phone: "📞 Inquiries: Call (702) 555-0400"
        },
        default_client: {
          primaryColor: "#2CEE76", primaryHover: "#1DD962", primaryGlow: "rgba(44, 238, 118, 0.1)",
          secondaryColor: "#0D2240", secondaryHover: "#0a1a30", secondaryGlow: "rgba(13, 34, 64, 0.1)",
          bgPrimary: "#F9F6F0", bgSecondary: "#FAF8F5", heroTitle: "",
          subtitle: "Redefining efficiency through scalable agents", logo: "Syncro Scale", phone: ""
        }
      };
      
      const themeDefaults = defaultsMap[clientId] || defaultsMap.default_client;

      return res.status(200).json({ 
        success: true, 
        settings: {
          name: fallback.name,
          niche: fallback.niche,
          greeting: fallback.greeting,
          chatGreeting: fallback.chatGreeting,
          ...themeDefaults
        }
      });
    }
    res.status(200).json({ success: true, settings });
  } catch (error: any) {
    console.error('❌ Failed to fetch client settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/client-settings', (req, res) => {
  try {
    const { clientId, settings } = req.body;
    if (!clientId || !settings) {
      return res.status(400).json({ success: false, error: 'clientId and settings are required' });
    }
    leadGuard.saveClientSettings(clientId, settings);
    console.log(`⚙️ [Settings Update] Saved settings for client "${clientId}"`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ Failed to save client settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/outbound/test-notification', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    const settings = leadGuard.getClientSettings(clientId);
    if (!settings) {
      return res.status(404).json({ success: false, error: `Client settings not found for "${clientId}"` });
    }

    const clientName = settings.name || 'Test Client';
    const mockLead = {
      name: 'John Doe (Test Notification)',
      phone: '+15555555555',
      email: 'john.doe.test@example.com',
      address: '123 Test Street, Sandbox City, SB 12345',
      damageType: settings.niche || 'General Restoration/Test',
      channel: 'Test Alert Trigger',
      clientName
    };

    console.log(`🧪 [Test Notification] Triggering test alert for client "${clientId}"...`);
    await triggerLeadNotifications(clientId, mockLead);

    res.status(200).json({ 
      success: true, 
      message: 'Test notification triggered successfully.',
      slackWebhookUrl: settings.slackWebhookUrl || null,
      notificationPhone: settings.notificationPhone || null,
      notifyOnLead: settings.notifyOnLead
    });
  } catch (error: any) {
    console.error('❌ Failed to trigger test notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stripe/subscribe', (req, res) => {
  try {
    const { clientId, cardBrand, cardLast4 } = req.body;
    if (!clientId || !cardBrand || !cardLast4) {
      return res.status(400).json({ success: false, error: 'clientId, cardBrand, and cardLast4 are required' });
    }
    const customerId = `cus_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    leadGuard.updateStripeSubscription(clientId, 'active', customerId, cardBrand, cardLast4);
    res.status(200).json({ success: true, customerId });
  } catch (error: any) {
    console.error('❌ Stripe subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stripe/cancel', (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }
    leadGuard.updateStripeSubscription(clientId, 'inactive', '', '', '');
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ Stripe cancel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stripe/charge-invoice', (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    const logs = leadGuard.getAllCallLogs(clientId);
    const VOICE_MINUTE_RATE = 0.15;
    const VOICE_SECOND_RATE = VOICE_MINUTE_RATE / 60;
    const TOKEN_RATE = 0.00003;
    const DISPATCH_RATE = 10.00;

    let totalVoiceDurationSeconds = 0;
    let totalTokens = 0;
    let totalDispatches = 0;

    logs.forEach(log => {
      const isVoice = log.source === 'browser' || log.source === 'telephony';
      const durationSec = log.duration_seconds || log.duration || 0;
      const tokens = log.tokens_used || 0;
      const dispatches = log.dispatch_count || 0;

      if (isVoice) totalVoiceDurationSeconds += durationSec;
      totalTokens += tokens;
      totalDispatches += dispatches;
    });

    const voiceCost = totalVoiceDurationSeconds * VOICE_SECOND_RATE;
    const tokenCost = totalTokens * TOKEN_RATE;
    const dispatchCost = totalDispatches * DISPATCH_RATE;
    const grandTotal = 299.00 + voiceCost + tokenCost + dispatchCost; // Include $299.00 base sub

    const invoiceId = `in_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const voiceMinutes = Number((totalVoiceDurationSeconds / 60).toFixed(2));

    const invoicePayload = {
      id: invoiceId,
      clientId,
      amount: Number(grandTotal.toFixed(2)),
      status: 'paid',
      voiceMinutes,
      tokensUsed: totalTokens,
      dispatches: totalDispatches,
      createdAt: new Date().toISOString().split('T')[0]
    };

    leadGuard.createInvoice(invoicePayload);
    res.status(200).json({ success: true, invoice: invoicePayload });
  } catch (error: any) {
    console.error('❌ Stripe monthly charge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post('/api/webhooks/meta-lead', async (req, res) => {
  let { name, phone, email, damageType, clientId } = req.body;

  // Handle nested Facebook Lead Gen payload if present
  if (req.body.entry?.[0]?.changes?.[0]?.value) {
    const fbValue = req.body.entry[0].changes[0].value;
    email = fbValue.email || fbValue.field_data?.find((f: any) => f.name === 'email')?.values?.[0];
    name = fbValue.full_name || fbValue.field_data?.find((f: any) => f.name === 'full_name' || f.name === 'name')?.values?.[0];
    phone = fbValue.phone_number || fbValue.field_data?.find((f: any) => f.name === 'phone_number' || f.name === 'phone')?.values?.[0];
    damageType = fbValue.damage_type || fbValue.field_data?.find((f: any) => f.name === 'damage_type' || f.name === 'damage')?.values?.[0];
    clientId = req.query.clientId || fbValue.client_id;
  }

  clientId = clientId || 'restoration_lv';
  damageType = damageType || 'General Restoration';

  if (!email || !name || !phone) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required lead details: name, phone, and email are required.' 
    });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanClient = clientId.toLowerCase().trim();

    const isDuplicate = leadGuard.isDuplicateForClient(cleanEmail, cleanClient);
    if (isDuplicate) {
      console.log(`🛡️ [Webhook Ingestion] Duplicate lead blocked for client "${cleanClient}": ${cleanEmail}`);
      return res.status(200).json({ 
        success: true, 
        message: 'Lead received but blocked as a duplicate for this client.', 
        blocked: true 
      });
    }

    console.log(`📥 [Webhook Ingestion] New lead received for client "${cleanClient}": ${name} (${cleanEmail})`);
    
    leadGuard.registerClientLead(cleanEmail, cleanClient, false, name, damageType);

    await appendLeadToSheet(cleanClient, { name, phone, email: cleanEmail, address: 'Meta Lead Ad Capture', damageType }, 'Active Inbound');

    const clientName = CLIENT_CONFIGS[cleanClient]?.name || 'Syncro Scale Restoration';

    triggerLeadNotifications(cleanClient, {
      name,
      phone,
      email: cleanEmail,
      address: 'Meta Lead Ad Capture',
      damageType,
      channel: 'Facebook Lead Ads',
      clientName
    });

    res.status(200).json({ 
      success: true, 
      message: 'Meta Lead Ads lead ingested successfully and notification dispatched.', 
      blocked: false 
    });
  } catch (error: any) {
    console.error('❌ Failed to process meta lead webhook:', error);
    res.status(500).json({ success: false, error: 'Internal server error processing webhook.', details: error.message });
  }
});

app.post('/api/scrape-leads', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query parameter is required' });
  }

  try {
    console.log(`🌐 Triggering Google Places Scraper for query: "${query}"`);
    const report = await runScraper(query);
    res.status(200).json(report);
  } catch (error: any) {
    console.error('❌ Failed to run Places scraper:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/upload-csv', async (req, res) => {
  const { fileName, content } = req.body;
  if (!fileName || !content) {
    return res.status(400).json({ success: false, error: 'fileName and content are required' });
  }

  try {
    const intakeDir = path.join(process.cwd(), 'intake');
    if (!fs.existsSync(intakeDir)) {
      fs.mkdirSync(intakeDir, { recursive: true });
    }
    const targetPath = path.join(intakeDir, fileName);
    fs.writeFileSync(targetPath, content, 'utf-8');
    console.log(`📥 Saved uploaded CSV to intake: ${targetPath}`);

    const report = await runLeadImportPipeline();
    res.status(200).json(report);
  } catch (error: any) {
    console.error('❌ Failed to process CSV upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-campaign', async (req, res) => {
  const { email, clientId, name, niche } = req.body;
  if (!email || !clientId) {
    return res.status(400).json({ success: false, error: 'email and clientId are required' });
  }

  try {
    console.log(`🚀 Dispatching outbound campaign trigger for: ${email}`);
    const outboundProcessor = new OutboundProcessor();
    
    const result = await outboundProcessor.processRawOutboundLead(clientId, {
      email,
      businessName: name || 'Business Owner',
      contactName: name || 'there',
      niche: niche || 'Emergency Restoration'
    });

    if (result.status === 'contacted' && result.sequence) {
      leadGuard.updateLeadStatus(email, clientId, 'contacted');
      
      res.status(200).json({
        success: true,
        emailBody: result.sequence.day1Email
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to dispatch copywriting sequence.'
      });
    }
  } catch (error: any) {
    console.error(`❌ Campaign dispatch critical failure:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/generate-campaign-draft', async (req, res) => {
  const { email, name, niche, template, clientId } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'email is required' });
  }

  try {
    console.log(`🧠 Generating outbound campaign draft for: ${email} with template: ${template} and client: ${clientId}`);
    const dbTemplate = clientId && template ? leadGuard.getOutboundTemplate(template, clientId) : undefined;
    const outboundProcessor = new OutboundProcessor();
    const draft = await outboundProcessor.generateLeadDraft({
      email,
      businessName: name || 'Business Owner',
      contactName: name || 'there',
      niche: niche || 'Emergency Restoration'
    }, template || 'mitigation', dbTemplate);

    res.status(200).json({
      success: true,
      subject: draft.subject,
      body: draft.body
    });
  } catch (error: any) {
    console.error(`❌ Campaign draft generation failure:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/outbound/templates', (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const templates = leadGuard.getOutboundTemplates(clientId);
    res.status(200).json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/outbound/templates', (req, res) => {
  try {
    const { id, clientId, name, subjectTemplate, bodyPrompt, isStatic } = req.body;
    if (!id || !clientId || !name || !subjectTemplate || !bodyPrompt) {
      return res.status(400).json({ success: false, error: 'id, clientId, name, subjectTemplate, and bodyPrompt are required' });
    }
    leadGuard.saveOutboundTemplate({
      id,
      clientId,
      name,
      subjectTemplate,
      bodyPrompt,
      isStatic: isStatic ? 1 : 0
    });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/outbound/logs', (req, res) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const logs = leadGuard.getOutreachLogs(clientId);
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/outbound/run-campaign', async (req, res) => {
  try {
    const { clientId, templateId } = req.body;
    if (!clientId || !templateId) {
      return res.status(400).json({ success: false, error: 'clientId and templateId are required' });
    }

    const leads = leadGuard.getAllRegisteredLeads(clientId);
    const pendingLeads = leads.filter(l => l.status === 'pending');
    
    if (pendingLeads.length === 0) {
      return res.status(200).json({ success: true, message: 'No pending prospects found for this campaign.', sentCount: 0 });
    }

    const dbTemplate = leadGuard.getOutboundTemplate(templateId, clientId);
    if (!dbTemplate) {
      return res.status(404).json({ success: false, error: `Template ${templateId} not found.` });
    }

    console.log(`📢 [Campaign Run] Starting campaign "${templateId}" for client "${clientId}". Found ${pendingLeads.length} pending leads.`);
    const outboundProcessor = new OutboundProcessor();
    let sentCount = 0;
    
    for (const lead of pendingLeads) {
      try {
        const draft = await outboundProcessor.generateLeadDraft({
          email: lead.email,
          businessName: lead.name || 'Business Owner',
          contactName: lead.name || 'there',
          niche: lead.niche || 'Emergency Restoration'
        }, templateId, dbTemplate);

        const result = await sendOutboundEmail(clientId, {
          to: lead.email,
          subject: draft.subject,
          htmlContent: draft.body.replace(/\n/g, '<br>')
        });

        const status = result.success ? 'sent' : 'failed';
        
        const logId = `ol_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        leadGuard.createOutreachLog({
          id: logId,
          clientId,
          email: lead.email,
          subject: draft.subject,
          body: draft.body,
          status
        });

        if (result.success) {
          leadGuard.updateLeadStatus(lead.email, clientId, 'contacted');
          sentCount++;
        }
      } catch (err: any) {
        console.error(`❌ Failed to send campaign email to ${lead.email}:`, err);
      }
    }

    res.status(200).json({ success: true, message: `Successfully sent ${sentCount} campaign email(s).`, sentCount });
  } catch (error: any) {
    console.error('❌ Failed to run batch campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/send-campaign-email', async (req, res) => {
  const { email, clientId, subject, body } = req.body;
  if (!email || !clientId || !subject || !body) {
    return res.status(400).json({ success: false, error: 'email, clientId, subject, and body are required' });
  }

  try {
    console.log(`🚀 Dispatching customized campaign email to: ${email}`);
    const result = await sendOutboundEmail(clientId, {
      to: email,
      subject,
      htmlContent: body.replace(/\n/g, '<br>')
    });

    const status = result.success ? 'sent' : 'failed';
    const logId = `ol_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    leadGuard.createOutreachLog({
      id: logId,
      clientId,
      email,
      subject,
      body,
      status
    });

    if (result.success) {
      leadGuard.updateLeadStatus(email, clientId, 'contacted');
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Failed to transmit email.' });
    }
  } catch (error: any) {
    console.error(`❌ Campaign send failure:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 AI Funnel Machine listening on port ${PORT}`);
  });
}