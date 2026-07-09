import WebSocket from 'ws';
import OpenAI from 'openai';
import { LeadGuard } from '../outbound/leadGuard.js';
import { performance } from 'perf_hooks';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const leadGuard = new LeadGuard();

export class VoicePipeline {
  private callSid: string = '';
  private streamSid: string = '';
  private clientId: string = 'default_client';
  private twilioWs: WebSocket;
  private deepgramWs: WebSocket | null = null;
  private conversationHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  
  private currentUserTurnTranscript: string = '';
  private debounceTimeout: NodeJS.Timeout | null = null;
  
  // Playback state
  private isPlaying: boolean = false;
  private playTimeout: NodeJS.Timeout | null = null;
  private currentResponseAudioBuffer: Buffer | null = null;
  private currentResponseOffset: number = 0;
  
  // Latency metrics tracking
  private userStoppedSpeakingTime: number = 0;
  private sttReceivedTime: number = 0;
  private llmFinishedTime: number = 0;
  private ttsFirstChunkTime: number = 0;
  private interrupted: boolean = false;
  
  // Active call callback
  private onTranscriptUpdate?: (transcript: string[]) => void;

  constructor(twilioWs: WebSocket, clientId: string, callSid: string, onTranscriptUpdate?: (transcript: string[]) => void) {
    this.twilioWs = twilioWs;
    this.clientId = clientId;
    this.callSid = callSid;
    this.onTranscriptUpdate = onTranscriptUpdate;
    
    // Initialize system prompt
    const instructions = this.getInstructions();
    this.conversationHistory.push({
      role: 'system',
      content: instructions
    });
  }

  /**
   * Retrieves instructions matching client config
   */
  private getInstructions(): string {
    const settings = leadGuard.getClientSettings(this.clientId);
    if (settings && settings.voiceInstructions) {
      return settings.voiceInstructions;
    }
    
    // Fallback/Default system prompts matching index_new.ts
    const name = settings?.name || "Syncro Scale";
    const niche = settings?.niche || "smart automations, AI integrations, workflow design, and digital transformation consulting";
    return `You are a helpful, professional, and friendly assistant for ${name}, specializing in ${niche}.
Your goal is to assist the user, qualify them, collect their contact details (name, phone, email, and situation details), and schedule a dispatch/follow-up slot.
Be conversational, helpful, and concise (respond briefly in 1-2 sentences). Always respond in clear spoken English.`;
  }

  /**
   * Starts the pipeline, connects to Deepgram STT, and plays the greeting
   */
  public async start(streamSid: string) {
    this.streamSid = streamSid;
    console.log(`[VoicePipeline] Starting pipeline for Call ${this.callSid}, Stream ${this.streamSid}`);
    
    // 1. Connect to Deepgram STT WebSocket
    this.connectDeepgramSTT();
    
    // 2. Play the greeting immediately
    const settings = leadGuard.getClientSettings(this.clientId);
    const greeting = settings?.greeting || "Hello! Thank you for calling. How can I help you today?";
    
    this.conversationHistory.push({
      role: 'assistant',
      content: greeting
    });
    
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(this.getTranscriptList());
    }

    console.log(`[VoicePipeline] Streaming greeting: "${greeting}"`);
    await this.playAssistantResponse(greeting);
  }

  /**
   * Connect to Deepgram Streaming Speech-to-Text WebSocket
   */
  private connectDeepgramSTT() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error("[VoicePipeline] DEEPGRAM_API_KEY is not defined in environment variables.");
      return;
    }

    // Connect to Deepgram's streaming STT endpoint
    const url = 'wss://api.deepgram.com/v1/listen?encoding=mulaw&sample_rate=8000&channels=1&endpointing=300&interim_results=true';
    this.deepgramWs = new WebSocket(url, {
      headers: {
        Authorization: `Token ${apiKey}`
      }
    });

    this.deepgramWs.on('open', () => {
      console.log(`[VoicePipeline] Connected to Deepgram Streaming STT for call ${this.callSid}`);
    });

    this.deepgramWs.on('message', (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          
          if (transcript && transcript.trim()) {
            // Interruption handling: if user starts speaking while assistant is playing audio, interrupt the agent.
            if (this.isPlaying) {
              console.log("[VoicePipeline] Interruption detected! Stopping agent audio.");
              this.interrupted = true;
              this.stopAudioPlayback();
            }

            if (data.is_final) {
              this.currentUserTurnTranscript += " " + transcript;
              
              // Reset safety debounce timer
              if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
              }
              
              // Set safety debounce timer (1.5 seconds of silence since last finalized chunk triggers turn)
              this.debounceTimeout = setTimeout(() => {
                this.triggerTurn();
              }, 1500);
            }
          }
          
          // Check for speech_final from Deepgram
          if (data.speech_final && this.currentUserTurnTranscript.trim()) {
            this.triggerTurn();
          }
        }
      } catch (err) {
        console.error("[VoicePipeline] Error parsing Deepgram STT message:", err);
      }
    });

    this.deepgramWs.on('error', (err) => {
      console.error("[VoicePipeline] Deepgram STT WebSocket Error:", err.message);
    });

    this.deepgramWs.on('close', () => {
      console.log(`[VoicePipeline] Deepgram STT connection closed for call ${this.callSid}`);
    });
  }

  /**
   * Handle incoming raw mulaw audio packet from Twilio
   */
  public handleInboundAudio(base64Payload: string) {
    if (this.deepgramWs && this.deepgramWs.readyState === WebSocket.OPEN) {
      const buffer = Buffer.from(base64Payload, 'base64');
      this.deepgramWs.send(buffer);
    }
  }

  /**
   * Trigger user turn: process transcript, run LLM loop, play response, log latency
   */
  private async triggerTurn() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    const userMessage = this.currentUserTurnTranscript.trim();
    if (!userMessage) return;

    this.currentUserTurnTranscript = '';
    console.log(`[VoicePipeline] User: "${userMessage}"`);

    // Reset interruption status for the new turn
    this.interrupted = false;
    
    // Mark user stopped speaking timestamp
    this.userStoppedSpeakingTime = performance.now();
    
    // Append user input to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });
    
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(this.getTranscriptList());
    }

    // Mark STT completion
    this.sttReceivedTime = performance.now();

    try {
      // 1. Run conversational LLM turn
      const responseText = await this.runLLM();
      this.llmFinishedTime = performance.now();
      
      this.conversationHistory.push({
        role: 'assistant',
        content: responseText
      });

      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(this.getTranscriptList());
      }

      // 2. Play response via Deepgram Aura TTS
      console.log(`[VoicePipeline] Agent: "${responseText}"`);
      await this.playAssistantResponse(responseText);

      // 3. Trigger profile extraction asynchronously in the background
      this.runBackgroundProfileExtractor();

    } catch (err) {
      console.error("[VoicePipeline] Error in conversational loop:", err);
    }
  }

  /**
   * Call OpenAI Chat Completion
   */
  private async runLLM(): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: this.conversationHistory
    });

    return response.choices[0]?.message?.content || "I'm sorry, I encountered an issue. Can you repeat that?";
  }

  /**
   * Fetch audio from Deepgram Aura TTS and stream to Twilio
   */
  private async playAssistantResponse(text: string) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error("[VoicePipeline] DEEPGRAM_API_KEY not set.");
      return;
    }

    try {
      // Fetch audio from Deepgram Aura
      // asteria voice is professional and friendly
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000&container=none`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        }
      );

      if (!response.ok) {
        throw new Error(`Deepgram TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      // Capture first audio generation latency
      this.ttsFirstChunkTime = performance.now();
      
      // Compute metrics
      const sttLatency = this.sttReceivedTime - this.userStoppedSpeakingTime;
      const llmProcessing = this.llmFinishedTime - this.sttReceivedTime;
      const ttsLatency = this.ttsFirstChunkTime - this.llmFinishedTime;
      const timeToFirstAudio = this.ttsFirstChunkTime - this.userStoppedSpeakingTime;

      // Log telemetry metrics to db
      leadGuard.insertVoiceTelemetryLog({
        callSid: this.callSid,
        sttLatencyMs: Math.max(0, sttLatency),
        llmProcessingMs: Math.max(0, llmProcessing),
        ttsLatencyMs: Math.max(0, ttsLatency),
        timeToFirstAudioMs: Math.max(0, timeToFirstAudio),
        interrupted: this.interrupted
      });

      console.log(`[Telemetry] Latencies: STT: ${sttLatency.toFixed(1)}ms | LLM: ${llmProcessing.toFixed(1)}ms | TTS: ${ttsLatency.toFixed(1)}ms | TTFT: ${timeToFirstAudio.toFixed(1)}ms`);

      // Start streaming audio chunks to Twilio
      this.streamAudioBuffer(audioBuffer);

    } catch (err) {
      console.error("[VoicePipeline] TTS generation or playback failed:", err);
    }
  }

  /**
   * Stream audio buffer to Twilio WebSocket in 20ms chunks (160 bytes of mulaw)
   */
  private streamAudioBuffer(buffer: Buffer) {
    // If there is any active playback, stop it first
    this.stopAudioPlayback();

    this.isPlaying = true;
    this.currentResponseAudioBuffer = buffer;
    this.currentResponseOffset = 0;

    const chunkSize = 160; // 20ms of 8000Hz 8-bit mulaw
    const interval = 20; // 20ms

    const sendNext = () => {
      if (!this.isPlaying || !this.currentResponseAudioBuffer) return;

      if (this.currentResponseOffset >= this.currentResponseAudioBuffer.length) {
        this.isPlaying = false;
        this.currentResponseAudioBuffer = null;
        return;
      }

      const chunk = this.currentResponseAudioBuffer.subarray(
        this.currentResponseOffset,
        this.currentResponseOffset + chunkSize
      );
      this.currentResponseOffset += chunkSize;

      const mediaMessage = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: chunk.toString('base64')
        }
      };

      if (this.twilioWs.readyState === WebSocket.OPEN) {
        this.twilioWs.send(JSON.stringify(mediaMessage));
      }

      this.playTimeout = setTimeout(sendNext, interval);
    };

    sendNext();
  }

  /**
   * Stop any active audio streaming and clear Twilio's playback buffer
   */
  private stopAudioPlayback() {
    this.isPlaying = false;
    if (this.playTimeout) {
      clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }
    this.currentResponseAudioBuffer = null;

    // Send clear signal to Twilio
    if (this.twilioWs.readyState === WebSocket.OPEN && this.streamSid) {
      this.twilioWs.send(JSON.stringify({
        event: 'clear',
        streamSid: this.streamSid
      }));
    }
  }

  /**
   * Run the background profile extractor to dynamically parse traits and update SQLite
   */
  private async runBackgroundProfileExtractor() {
    // Spawn asynchronous background task
    (async () => {
      try {
        const transcriptText = this.conversationHistory
          .filter(m => m.role !== 'system')
          .map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
          .join('\n');

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert lead profiling parser. Analyze the conversation transcript between the Customer and Agent.
Identify the customer's contact details (name, phone, email) and situation details.
Format the output as a strict JSON object with the following fields:
{
  "name": "extracted name or empty string",
  "phone": "extracted phone or empty string",
  "email": "extracted email or empty string",
  "traits": {
    "emergency_type": "type of damage (e.g. water mitigation, fire restoration, roof leak, etc.) or empty string",
    "urgency_level": "low/medium/high/critical or empty string",
    "standing_water": "yes/no/unknown or empty string",
    "property_address": "address or empty string"
  },
  "observation": "a brief 1-sentence note of what the customer reported on this turn or status (e.g., 'Customer reported water damage in basement and is requesting emergency dispatch.')"
}
Return raw JSON output only. No markdown formatting.`
            },
            {
              role: 'user',
              content: transcriptText
            }
          ],
          response_format: { type: 'json_object' }
        });

        const textResponse = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(textResponse);

       // --- UPDATED SAFETY FALLBACK CODE ---
// Fallback to phone number or Call SID if the email hasn't been spoken yet
const email = parsed.email 
  ? parsed.email.toLowerCase().trim() 
  : (parsed.phone ? `${parsed.phone.replace(/\D/g, '')}@phone.internal` : `${this.callSid}@call.internal`);

if (email) {
          const existing = leadGuard.getCustomerProfile(email) as any;
          
          let observationsList: string[] = [];
          let existingTraits: Record<string, any> = {};

          if (existing) {
            try {
              observationsList = JSON.parse(existing.observations || '[]');
            } catch (_) {}
            try {
              existingTraits = JSON.parse(existing.extracted_traits || '{}');
            } catch (_) {}
          }

          // Append new observation if it's descriptive and unique
          if (parsed.observation && parsed.observation.trim() && !observationsList.includes(parsed.observation)) {
            observationsList.push(parsed.observation);
          }

          // Merge traits
          const mergedTraits = {
            ...existingTraits,
            ...parsed.traits
          };

          leadGuard.upsertCustomerProfile({
            email: email,
            name: parsed.name || (existing ? existing.name : ''),
            phone: parsed.phone || (existing ? existing.phone : ''),
            extractedTraits: JSON.stringify(mergedTraits),
            observations: JSON.stringify(observationsList)
          });

          console.log(`[Profile Extractor] Updated customer profile for: ${email}`);
        }
      } catch (err) {
        console.error("[Profile Extractor] Background task failed:", err);
      }
    })();
  }

  /**
   * Return simplified conversation transcript
   */
  public getTranscriptList(): string[] {
    return this.conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`);
  }

  /**
   * Cleanup connections
   */
  public destroy() {
    this.stopAudioPlayback();
    if (this.deepgramWs) {
      if (this.deepgramWs.readyState === WebSocket.OPEN) {
        this.deepgramWs.close();
      }
      this.deepgramWs = null;
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    console.log(`[VoicePipeline] Pipeline destroyed for Call ${this.callSid}`);
  }
}
