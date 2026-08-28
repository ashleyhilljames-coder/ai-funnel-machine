import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Express, Request, Response } from 'express';
import Parser from 'rss-parser';
import { GoogleGenAI, Type } from '@google/genai';
import { IncomingWebhook } from '@slack/webhook';
import dotenv from 'dotenv';
import {
  PLATFORM_TARGETS,
  HIGH_INTENT_PHRASES,
  NEGATIVE_BLOCKLIST,
  DISPATCH_PHONE_NUMBER,
  SECONDARY_WEATHER_KEYWORDS,
  formatSuggestedReply,
  calculateIntentScore,
  checkNWSWeatherAlerts,
  setWeatherAlertActiveState,
  getWeatherAlertActiveState,
  browserTarget,
  PostPayload
} from './scraper/emergencyScraper.js';
import { fetchCraigslistLeads, CraigslistLead } from './scraper/craigslistScraper.js';
import { fetchXLeads, XLead } from './scraper/xScraper.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEADS_FILE_PATH = path.join(process.cwd(), 'leads.json');

export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  targetWebhookUrl: process.env.TARGET_WEBHOOK_URL || 'http://localhost:3000/webhook/lead',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  ecodryDiscordWebhookUrl: process.env.ECODRY_DISCORD_WEBHOOK_URL || '',
  pollingIntervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES || '4', 10),
  maxItemsPerBatch: parseInt(process.env.MAX_ITEMS_PER_BATCH || '10', 10),
  platformTargets: PLATFORM_TARGETS
};

export function verifyEnvironment(): void {
  console.log(`\n==================================================`);
  console.log(`⚙️ ENVIRONMENT CONFIGURATION CHECK`);
  console.log(`==================================================`);
  console.log(`🔑 GEMINI_API_KEY: ${CONFIG.geminiApiKey ? '✅ Loaded (' + CONFIG.geminiApiKey.substring(0, 6) + '...)' : '⚠️ Missing (Using rule-based qualification)'}`);
  console.log(`📢 DISCORD_WEBHOOK_URL (#leads): ${CONFIG.discordWebhookUrl ? '✅ Loaded (' + CONFIG.discordWebhookUrl.substring(0, 40) + '...)' : '❌ MISSING from process.env'}`);
  console.log(`🚀 ECODRY_DISCORD_WEBHOOK_URL (#ecodry-live-leads): ${CONFIG.ecodryDiscordWebhookUrl ? '✅ Loaded (' + CONFIG.ecodryDiscordWebhookUrl.substring(0, 40) + '...)' : '❌ MISSING from process.env'}`);
  console.log(`💬 SLACK_WEBHOOK_URL: ${CONFIG.slackWebhookUrl ? '✅ Loaded (' + CONFIG.slackWebhookUrl.substring(0, 40) + '...)' : 'ℹ️ Not set'}`);
  console.log(`⏱️ POLLING_INTERVAL: ${CONFIG.pollingIntervalMinutes} minutes (Near real-time 3-5m range)`);
  console.log(`📦 MAX_BATCH_ITEMS: ${CONFIG.maxItemsPerBatch}`);
  console.log(`==================================================\n`);
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (OrganicLeadAgent/1.0)',
    'Accept': 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  }
});

let ai: GoogleGenAI | null = null;
if (CONFIG.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: CONFIG.geminiApiKey });
}

export function loadProcessedLeads(): any[] {
  try {
    if (!fs.existsSync(LEADS_FILE_PATH)) {
      fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(LEADS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error('⚠️ Error reading leads.json:', error.message);
    return [];
  }
}

export function saveProcessedLead(leadRecord: any): void {
  try {
    const leads = loadProcessedLeads();
    leads.push(leadRecord);
    fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify(leads, null, 2));
  } catch (error: any) {
    console.error('⚠️ Error saving to leads.json:', error.message);
  }
}

export function isAlreadyProcessed(itemId: string, processedLeads: any[], itemLink?: string): boolean {
  if (!itemId && !itemLink) return false;
  return processedLeads.some(lead =>
    (itemId && (lead.id === itemId || lead.link === itemId)) ||
    (itemLink && (lead.link === itemLink || lead.id === itemLink))
  );
}

export async function qualifyLead(title: string, description: string, timestamp: string | number = Date.now(), isMock = false): Promise<any> {
  const post: PostPayload = { title, text: description, timestamp };
  const intentResult = calculateIntentScore(post);

  if (!intentResult.passed) {
    return {
      is_valid_lead: false,
      urgency_level: 'Low',
      intentScore: intentResult.score,
      summary: `Filtered out by intent rules: ${intentResult.reason}`,
      suggested_reply: ''
    };
  }

  if (isMock || !ai) {
    const summary = `${title}`;
    const urgency = intentResult.hasHighIntentPhrase ? 'High' : 'Medium';
    return {
      is_valid_lead: true,
      urgency_level: urgency,
      intentScore: intentResult.score,
      summary: summary,
      suggested_reply: formatSuggestedReply(summary)
    };
  }

  try {
    const prompt = `Analyze emergency post: Title: ${title}, Content: ${description}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `Senior Lead Qualification Agent for emergency home relief services. Respond strictly in JSON schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid_lead: { type: Type.BOOLEAN },
            urgency_level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            summary: { type: Type.STRING },
            suggested_reply: { type: Type.STRING }
          },
          required: ['is_valid_lead', 'urgency_level', 'summary', 'suggested_reply']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const cleanSummary = (result.summary || title).replace(/https?:\/\/\S+/gi, '').replace(/www\.\S+/gi, '').trim();
    return {
      ...result,
      suggested_reply: formatSuggestedReply(cleanSummary),
      intentScore: intentResult.score
    };
  } catch (error: any) {
    const summary = `${title}`;
    return {
      is_valid_lead: true,
      urgency_level: intentResult.hasHighIntentPhrase ? 'High' : 'Medium',
      intentScore: intentResult.score,
      summary,
      suggested_reply: formatSuggestedReply(summary)
    };
  }
}

export async function processLeadBatch(sourceName: string, rawLeads: any[]): Promise<number> {
  console.log(`\n==================================================`);
  console.log(`📡 [PIPELINE STAGE 1: INGESTION] Platform [${sourceName}]: ${rawLeads.length} raw leads fetched`);
  console.log(`==================================================`);

  const processedLeads = loadProcessedLeads();
  let count = 0;
  let rawItemsCount = rawLeads.length;
  let passedDedupCount = 0;
  let failedStage3Count = 0;
  let failedStage4Count = 0;
  let dispatchedCount = 0;

  for (const item of rawLeads) {
    const itemId = item.id || item.link;
    const itemLink = item.link || item.id;

    if (!itemId || isAlreadyProcessed(itemId, processedLeads, itemLink)) {
      continue;
    }

    passedDedupCount++;
    const evaluation = await qualifyLead(item.title, item.text || item.contentSnippet || '', item.date || Date.now());

    if (!evaluation.intentScore || evaluation.intentScore < 0.85 || !evaluation.is_valid_lead) {
      if (!evaluation.is_valid_lead && evaluation.summary?.includes('intent rules')) {
        failedStage3Count++;
      } else {
        failedStage4Count++;
      }
    }

    const leadRecord = {
      id: itemId,
      title: item.title,
      link: itemLink,
      source: item.source || sourceName,
      date: item.date || new Date().toISOString(),
      is_valid_lead: evaluation.is_valid_lead,
      urgency_level: evaluation.urgency_level,
      intentScore: evaluation.intentScore || 0,
      summary: evaluation.summary,
      suggested_reply: evaluation.suggested_reply,
      processedAt: new Date().toISOString()
    };

    saveProcessedLead(leadRecord);
    processedLeads.push(leadRecord);
    count++;
  }

  console.log(`\n📊 [TARGET AUDIT SUMMARY - ${sourceName}]:`);
  console.log(`   • Raw Items Fetched: ${rawItemsCount}`);
  console.log(`   • Passed Stage 2 (Dedup): ${passedDedupCount}`);
  console.log(`   • Failed Stage 3 (Intent Pre-filter): ${failedStage3Count}`);
  console.log(`   • Failed Stage 4 (AI Qualification): ${failedStage4Count}`);
  console.log(`   • Alerts Dispatched: ${dispatchedCount}`);

  return count;
}

export async function processAllFeeds(): Promise<number> {
  let totalProcessed = 0;

  // 1. Craigslist Modular Scraper
  try {
    const clLeads = await fetchCraigslistLeads();
    totalProcessed += await processLeadBatch('Craigslist', clLeads);
  } catch (err: any) {
    console.error('❌ Error during Craigslist scraper batch:', err.message);
  }

  // 2. X / Twitter Modular Scraper
  try {
    const xLeads = await fetchXLeads();
    totalProcessed += await processLeadBatch('X / Twitter', xLeads);
  } catch (err: any) {
    console.error('❌ Error during X / Twitter scraper batch:', err.message);
  }

  return totalProcessed;
}
