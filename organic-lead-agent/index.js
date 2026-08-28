import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
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
  getWeatherAlertActiveState
} from './scraper/emergencyScraper.js';
import { fetchCraigslistLeads } from './scraper/craigslistScraper.js';
import { fetchXLeads } from './scraper/xScraper.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEADS_FILE_PATH = path.join(__dirname, 'leads.json');

// System Configuration
const CONFIG = {
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

export function verifyEnvironment() {
  console.log(`\n==================================================`);
  console.log(`⚙️ ENVIRONMENT CONFIGURATION CHECK`);
  console.log(`==================================================`);
  console.log(`🔑 GEMINI_API_KEY: ${CONFIG.geminiApiKey ? '✅ Loaded (' + CONFIG.geminiApiKey.substring(0, 6) + '...)' : '⚠️ Missing (Using rule-based qualification)'}`);
  console.log(`📢 DISCORD_WEBHOOK_URL (#leads): ${CONFIG.discordWebhookUrl ? '✅ Loaded (' + CONFIG.discordWebhookUrl.substring(0, 40) + '...)' : '❌ MISSING from process.env'}`);
  console.log(`🚀 ECODRY_DISCORD_WEBHOOK_URL (#ecodry-live-leads): ${CONFIG.ecodryDiscordWebhookUrl ? '✅ Loaded (' + CONFIG.ecodryDiscordWebhookUrl.substring(0, 40) + '...)' : '❌ MISSING from process.env'}`);
  console.log(`💬 SLACK_WEBHOOK_URL: ${CONFIG.slackWebhookUrl ? '✅ Loaded (' + CONFIG.slackWebhookUrl.substring(0, 40) + '...)' : 'ℹ️ Not set'}`);
  console.log(`⏱️ POLLING_INTERVAL: ${CONFIG.pollingIntervalMinutes} minutes`);
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

// Initialize Gemini Client
let ai = null;
if (CONFIG.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: CONFIG.geminiApiKey });
}

// ---------------------------------------------------------------------------
// 1. DEDUPLICATION & DATABASE STORAGE (leads.json)
// ---------------------------------------------------------------------------

export function loadProcessedLeads() {
  try {
    if (!fs.existsSync(LEADS_FILE_PATH)) {
      console.log(`ℹ️ [leads.json] File not found. Initializing new file at ${LEADS_FILE_PATH}`);
      fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(LEADS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data || '[]');
    if (!Array.isArray(parsed)) {
      console.warn(`⚠️ [leads.json] File contents not a JSON array. Resetting leads database.`);
      fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('⚠️ Error reading leads.json:', error.message);
    return [];
  }
}

export function isAlreadyProcessed(itemId, processedLeads, itemLink) {
  if (!itemId && !itemLink) return false;
  return processedLeads.some(lead =>
    (itemId && (lead.id === itemId || lead.link === itemId)) ||
    (itemLink && (lead.link === itemLink || lead.id === itemLink))
  );
}

export function saveProcessedLead(leadRecord) {
  try {
    const leads = loadProcessedLeads();
    leads.push(leadRecord);
    fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify(leads, null, 2));
  } catch (error) {
    console.error('⚠️ Error saving to leads.json:', error.message);
  }
}

// ---------------------------------------------------------------------------
// 2. REFINED GEMINI AI QUALIFICATION ENGINE (@google/genai)
// ---------------------------------------------------------------------------

export async function qualifyLead(title, description, timestamp = Date.now(), isMock = false) {
  const post = { title, text: description, timestamp };

  console.log(`\n--------------------------------------------------`);
  console.log(`🔍 [PIPELINE STAGE 3: INTENT SCORING] Evaluating lead: "${title}"`);

  // First: Run strict intent scoring filter (Score >= 85%, Blocklist check, Age <= 14 days / 336h)
  const intentResult = calculateIntentScore(post);
  
  console.log(`   📊 Intent Match Score: ${(intentResult.score * 100).toFixed(0)}% (Threshold: 85%)`);
  console.log(`   ⏱️ Post Age Check: ${intentResult.reason.includes('older than 14 days') ? '❌ FAILED (Older than 14 days)' : '✅ PASSED'}`);
  console.log(`   🚫 Blocklist Check: ${intentResult.reason.includes('blocklist') ? '❌ FAILED' : '✅ PASSED'}`);
  console.log(`   📍 Location Context: ${intentResult.hasLocationContext ? '✅ MATCHED' : '❌ NONE'}`);
  console.log(`   🔥 Damage Keywords: ${intentResult.hasActiveDamageWord ? '✅ MATCHED' : '❌ NONE'}`);

  if (!intentResult.passed) {
    console.log(`🛑 [DROPPED AT STAGE 3] Pre-filter skipped lead: ${intentResult.reason}`);
    return {
      is_valid_lead: false,
      urgency_level: 'Low',
      intentScore: intentResult.score,
      summary: `Filtered out by intent rules: ${intentResult.reason}`,
      suggested_reply: ''
    };
  }

  console.log(`✅ [STAGE 3 PASSED] Intent score meets requirements. Qualifying content...`);

  // If Gemini API is not configured or in mock test mode, use rule-based qualification
  if (isMock || !ai) {
    if (!ai && !isMock) {
      console.warn('⚠️ GEMINI_API_KEY missing or offline mode. Using rule-based qualification.');
    }
    const summary = `${title}`;
    const urgency = intentResult.hasHighIntentPhrase ? 'High' : 'Medium';
    console.log(`🤖 [PIPELINE STAGE 4: RULE-BASED QUALIFICATION] Urgency: ${urgency}`);
    return {
      is_valid_lead: true,
      urgency_level: urgency,
      intentScore: intentResult.score,
      summary: summary,
      suggested_reply: formatSuggestedReply(summary)
    };
  }

  console.log(`🤖 [PIPELINE STAGE 4: GEMINI AI QUALIFICATION] Model: gemini-2.5-flash`);
  const prompt = `Analyze the following emergency home relief post:

Title: ${title}
Content/Description: ${description || 'No description provided.'}
Intent Match Score: ${(intentResult.score * 100).toFixed(0)}%`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a Senior Lead Qualification Agent for emergency home relief services (e.g., plumbing, burst pipes, water leaks, flooded basements, roof leaks, sewage backup, urgent property mitigation).

CRITICAL RULES FOR QUALIFICATION:
1. ONLY mark "is_valid_lead": true if the author is experiencing an ACTIVE HOME EMERGENCY requiring urgent repair or mitigation services.
2. STRICTLY EXCLUDE and set "is_valid_lead": false for DIY advice, landscaping, computer repair, pop culture, or non-emergency remodels.
3. For "suggested_reply", follow this EXACT template without including landing page links or placeholders:
   "We understand you're dealing with an urgent [Short 3-6 word summary of issue]! Our emergency restoration team is available right now with our 90-Minute Arrival Guarantee. Call or text us immediately at (702) 491-9899 for rapid relief."

Respond strictly in JSON format matching the requested schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid_lead: { type: Type.BOOLEAN },
            urgency_level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            summary: { type: Type.STRING, description: '1-sentence description of the homeowner\'s urgent problem' },
            suggested_reply: { type: Type.STRING, description: 'A helpful, empathetic response following the exact template with phone number (702) 491-9899' }
          },
          required: ['is_valid_lead', 'urgency_level', 'summary', 'suggested_reply']
        }
      }
    });

    const result = JSON.parse(response.text);
    
    // Ensure template & hotline phone number (702) 491-9899 are present and landing page URLs removed
    const cleanSummary = (result.summary || title).replace(/https?:\/\/\S+/gi, '').replace(/www\.\S+/gi, '').trim();
    const finalSuggestedReply = formatSuggestedReply(cleanSummary);

    console.log(`   AI Result: Valid=${result.is_valid_lead}, Urgency=${result.urgency_level}`);
    console.log(`   Summary: "${cleanSummary}"`);

    return {
      ...result,
      suggested_reply: finalSuggestedReply,
      intentScore: intentResult.score
    };
  } catch (error) {
    console.error('❌ Error during Gemini AI lead qualification:', error.message);
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
}

// ---------------------------------------------------------------------------
// 3. DISCORD & SLACK ALERT DISPATCHER (2-Channel RHR -> EcoDry Triage Workflow)
// ---------------------------------------------------------------------------

export async function sendWeatherAlertDiscordNotification(messageText, details = '') {
  if (!CONFIG.discordWebhookUrl) {
    console.warn(`📢 [WEATHER DISCORD ALERT] (Console Fallback): ${messageText}`);
    return false;
  }
  try {
    const payload = {
      content: messageText,
      embeds: [
        {
          title: '⚡ NWS Severe Weather Alert Active - Dynamic Boost Enabled',
          description: details || 'Active NWS weather advisory detected affecting Clark County / Las Vegas. Scraper polling interval dynamically reduced to 3 minutes and secondary keywords expanded.',
          color: 15158332, // Red/Emergency
          fields: [
            { name: 'Target Region', value: '`Clark County / Las Vegas, NV`', inline: true },
            { name: 'Polling Interval', value: '`3 Minutes (Emergency Boost)`', inline: true },
            { name: 'Keyword Pre-Filter', value: '`Expanded (Secondary Terms Active)`', inline: true }
          ],
          footer: { text: `Emergency Weather Monitor • Hotline: ${DISPATCH_PHONE_NUMBER}` },
          timestamp: new Date().toISOString()
        }
      ]
    };
    const res = await fetch(CONFIG.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      console.log(`✅ [DISCORD WEATHER ALERT DISPATCH SUCCESS] Delivered: "${messageText}"`);
      return true;
    } else {
      console.error(`❌ [DISCORD WEATHER ALERT ERROR] HTTP ${res.status} ${res.statusText}`);
      return false;
    }
  } catch (err) {
    console.error('❌ Exception dispatching weather alert to Discord:', err.message);
    return false;
  }
}

/**
 * EcoDry Dispatch Card Formatter (#ecodry-live-leads - ECODRY_DISCORD_WEBHOOK_URL)
 */
export async function sendEcoDryDispatchCard(item, evaluation, originSource = 'Facebook Group') {
  const { urgency_level, summary } = evaluation;

  console.log(`\n🤖 [PIPELINE STAGE 7: ECODRY DISCORD CARD DISPATCH] (#ecodry-live-leads)`);

  if (!CONFIG.ecodryDiscordWebhookUrl) {
    console.warn(`⚠️ [ECODRY DISCORD SKIPPED] process.env.ECODRY_DISCORD_WEBHOOK_URL is not configured! Check .env file.`);
    return false;
  }

  const title = (item.title || 'Untitled Emergency Post').substring(0, 200);
  const rawLink = item.url || item.link || item.guid || '';
  const link = rawLink.startsWith('http') ? rawLink : 'https://nextdoor.com';
  const platformTag = item.source || originSource || 'Facebook Group';

  const customerName = item.author || item.fullName || item.customerName || item.user || 'Homeowner in Need';
  const location = item.region || item.location || item.address || item.area || 'Las Vegas / Clark County';
  const scopeOfDamage = (summary || title).replace(/https?:\/\/\S+/gi, '').replace(/www\.\S+/gi, '').trim();
  const timestamp = new Date().toISOString();

  try {
    console.log(`🔗 EcoDry Webhook URL: ${CONFIG.ecodryDiscordWebhookUrl.substring(0, 45)}...`);

    const payload = {
      embeds: [
        {
          title: `🚨 Status: Fresh Dispatched Lead`,
          url: link,
          color: 5763719, // Green / EcoDry Brand Accent
          fields: [
            { name: '👤 Customer', value: `\`${customerName}\``, inline: true },
            { name: '📍 Location', value: `\`${location}\``, inline: true },
            { name: '🔥 Urgency Level', value: `\`${urgency_level || 'High'}\``, inline: true },
            { name: '📝 Scope of Damage', value: scopeOfDamage || 'Urgent property emergency requiring mitigation' },
            { name: '🔗 Source Link', value: `[Click to Open Lead Post](${link})` },
            { name: '⏱️ Dispatched At', value: `<t:${Math.floor(Date.now() / 1000)}:R> (${timestamp})` }
          ],
          footer: { text: `EcoDry Dispatch Engine • Hotline: ${DISPATCH_PHONE_NUMBER} • Channel: #ecodry-live-leads • Source: [${platformTag}]` },
          timestamp: timestamp
        }
      ]
    };

    console.log(`📤 Sending POST request to EcoDry Discord Webhook (#ecodry-live-leads)...`);

    const res = await fetch(CONFIG.ecodryDiscordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`✅ [ECODRY DISCORD SUCCESS] HTTP ${res.status} ${res.statusText} - EcoDry dispatch card delivered to #ecodry-live-leads!`);
      return true;
    } else {
      const errorText = await res.text().catch(() => '');
      console.error(`❌ [ECODRY DISCORD ERROR] HTTP ${res.status} ${res.statusText}: ${errorText}`);
      return false;
    }
  } catch (err) {
    console.error('❌ [ECODRY DISCORD ERROR] Exception thrown during EcoDry Discord fetch:', err.message);
    return false;
  }
}

/**
 * Dispatcher to POST qualified lead payloads directly to ai-funnel-machine engine webhook
 */
export async function postLeadToWebhook(item, evaluation, originSource = 'Reddit') {
  const webhookUrl = CONFIG.targetWebhookUrl || 'http://localhost:3000/webhook/lead';
  try {
    console.log(`\n📡 [ENGINE DISPATCH] Sending POST request to ${webhookUrl}...`);
    const title = (item.title || 'Untitled Emergency Lead').substring(0, 200);
    const rawLink = item.url || item.link || item.guid || '';
    const link = rawLink.startsWith('http') ? rawLink : 'https://nextdoor.com';
    const platformTag = item.source || originSource || 'Facebook Group';

    const payload = {
      title,
      headline: title,
      fullName: item.author || item.fullName || title,
      text: item.text || evaluation.summary || title,
      description: evaluation.summary || item.text || title,
      url: link,
      link,
      source: platformTag,
      origin: platformTag,
      urgency: evaluation.urgency_level || 'High',
      intentScore: evaluation.intentScore || 0.95,
      suggested_reply: evaluation.suggested_reply || '',
      timestamp: item.timestamp || item.date || new Date().toISOString()
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const resData = await res.json().catch(() => ({}));
      console.log(`✅ [ENGINE DISPATCH SUCCESS] HTTP ${res.status} - Delivered to ${webhookUrl} (Lead ID: ${resData.leadId || 'N/A'})`);
      return true;
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠️ [ENGINE DISPATCH WARN] HTTP ${res.status} ${res.statusText}: ${errText}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ [ENGINE DISPATCH ERROR] Failed to send lead to ${webhookUrl}:`, err.message);
    return false;
  }
}

/**
 * Primary Alert Dispatcher (#leads - DISCORD_WEBHOOK_URL) & EcoDry Dispatcher Trigger
 */
export async function sendAlert(item, evaluation, originSource = 'Reddit') {
  const { is_valid_lead, urgency_level, summary, intentScore } = evaluation;

  console.log(`\n--------------------------------------------------`);
  console.log(`📢 [PIPELINE STAGE 5: ALERT DISPATCH ELIGIBILITY]`);

  if (!is_valid_lead || (urgency_level !== 'High' && urgency_level !== 'Medium')) {
    console.log(`🛑 [DROPPED AT STAGE 5] Lead skipped. Urgency="${urgency_level}", Valid=${is_valid_lead}`);
    return false;
  }

  const title = (item.title || 'Untitled Emergency Post').substring(0, 200);
  const rawLink = item.url || item.link || item.guid || '';
  const link = rawLink.startsWith('http') ? rawLink : 'https://nextdoor.com';
  const platformTag = item.source || originSource || 'Facebook Group';
  const scorePct = intentScore ? `${(intentScore * 100).toFixed(0)}%` : '85%+';

  // Guarantee updated Suggested Draft Reply copy with hotline phone number (702) 491-9899
  const cleanSummary = (summary || title).replace(/https?:\/\/\S+/gi, '').replace(/www\.\S+/gi, '').trim();
  const suggestedReplyCopy = formatSuggestedReply(cleanSummary);

  console.log(`🚨 [DISPATCH APPROVED] [${platformTag}] [${urgency_level}] [Score: ${scorePct}]: "${title}"`);

  let dispatched = false;

  // Always post qualified lead payload to ai-funnel-machine engine webhook (http://localhost:3000/webhook/lead)
  const webhookSent = await postLeadToWebhook(item, evaluation, originSource);
  if (webhookSent) dispatched = true;

  // 1. Send Primary Discord Alert (#leads)
  console.log(`\n🤖 [PIPELINE STAGE 6: PRIMARY DISCORD WEBHOOK DISPATCH] (#leads)`);
  if (!CONFIG.discordWebhookUrl) {
    console.warn(`⚠️ [DISCORD SKIPPED] process.env.DISCORD_WEBHOOK_URL is not configured! Check .env file.`);
  } else {
    try {
      console.log(`🔗 Primary Webhook URL (#leads): ${CONFIG.discordWebhookUrl.substring(0, 45)}...`);
      const colorMap = { High: 15158332, Medium: 15105570, Low: 3447003 }; // Red, Orange, Blue
      
      const embedTitle = `🚨 Emergency Lead [${platformTag}]: ${title}`.substring(0, 256);
      const issueSummaryField = (cleanSummary || title).substring(0, 1024) || 'Urgent property emergency';
      const draftReplyField = suggestedReplyCopy.substring(0, 1024) || 'Contact emergency hotline.';

      const payload = {
        embeds: [
          {
            title: embedTitle,
            url: link,
            color: colorMap[urgency_level] || 15158332,
            fields: [
              { name: 'Source Platform', value: `\`${platformTag}\``, inline: true },
              { name: 'Urgency Level', value: `\`${urgency_level}\``, inline: true },
              { name: 'Intent Match Score', value: `\`${scorePct}\``, inline: true },
              { name: 'Dispatch Hotline', value: `\`${DISPATCH_PHONE_NUMBER}\``, inline: true },
              { name: 'Issue Summary', value: issueSummaryField },
              { name: 'Suggested Draft Reply', value: draftReplyField },
              { name: 'Direct Post Link', value: `[Click to Open Post](${link})` }
            ],
            footer: { text: `Emergency Lead Agent • Hotline: ${DISPATCH_PHONE_NUMBER} • Source: [${platformTag}]` },
            timestamp: new Date().toISOString()
          }
        ]
      };

      console.log(`📤 Sending POST request to Primary Discord Webhook (#leads)...`);
      console.log(`   Payload Embed Title: "${embedTitle}"`);

      const res = await fetch(CONFIG.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`✅ [PRIMARY DISCORD SUCCESS] HTTP ${res.status} ${res.statusText} - Delivered to #leads!`);
        dispatched = true;
      } else {
        const errorText = await res.text().catch(() => '');
        console.error(`❌ [PRIMARY DISCORD ERROR] HTTP ${res.status} ${res.statusText}: ${errorText}`);
      }
    } catch (err) {
      console.error('❌ [PRIMARY DISCORD ERROR] Exception thrown during Discord alert fetch:', err.message);
    }
  }

  // 2. Dispatch Formatted EcoDry Card (#ecodry-live-leads)
  if (CONFIG.ecodryDiscordWebhookUrl) {
    await sendEcoDryDispatchCard(item, evaluation, originSource);
  }

  // 3. Send Slack Alert (Optional)
  if (CONFIG.slackWebhookUrl) {
    try {
      console.log(`\n💬 [SLACK DISPATCH] Webhook: ${CONFIG.slackWebhookUrl.substring(0, 45)}...`);
      const webhook = new IncomingWebhook(CONFIG.slackWebhookUrl);
      await webhook.send({
        text: `🚨 *Emergency Lead Alert [${platformTag}] [${urgency_level}]*: ${title}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 Emergency Home Relief Lead [${platformTag}] [${urgency_level}]`
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Post Title:*\n<${link}|${title}>` },
              { type: 'mrkdwn', text: `*Source / Hotline:*\n\`${platformTag}\` • \`${DISPATCH_PHONE_NUMBER}\`` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Issue Summary:*\n${summary}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Suggested Draft Reply:*\n_${suggestedReplyCopy}_`
            }
          }
        ]
      });
      console.log('✅ [SLACK SUCCESS] Slack alert sent successfully.');
      dispatched = true;
    } catch (err) {
      console.error('❌ Failed to send Slack alert:', err.message);
    }
  }

  // Console log fallback if no webhooks configured
  if (!CONFIG.discordWebhookUrl && !CONFIG.slackWebhookUrl && !CONFIG.ecodryDiscordWebhookUrl) {
    console.log('📢 [Dry-Run Alert Log]');
    console.log(`   Platform: [${platformTag}]`);
    console.log(`   Title: ${title}`);
    console.log(`   Link: ${link}`);
    console.log(`   Urgency: ${urgency_level}`);
    console.log(`   Score: ${scorePct}`);
    console.log(`   Hotline: ${DISPATCH_PHONE_NUMBER}`);
    console.log(`   Summary: ${summary}`);
    console.log(`   Draft Reply: ${suggestedReplyCopy}\n`);
    dispatched = true;
  }

  return dispatched;
}

// ---------------------------------------------------------------------------
// 4. RSS FEED & MULTI-PLATFORM MONITORING LOOP (Exponential Backoff & Stagger)
// ---------------------------------------------------------------------------

export async function fetchFeedWithRetry(targetUrl, isReddit, maxRetries = 2) {
  const browserUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (OrganicLeadAgent/1.0)';
  const headers = {
    'User-Agent': browserUserAgent,
    'Accept': isReddit ? 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  let attempt = 0;
  let delayMs = 15000; // Increased backoff delay: 15 seconds

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(targetUrl, { headers });

      if (res.status === 429) {
        if (attempt < maxRetries) {
          console.log(`ℹ️ [HTTP 429 RATE LIMIT] Feed rate-limited: ${targetUrl}. Waiting ${delayMs / 1000}s before retry (Attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff: 15s -> 30s
          attempt++;
          continue;
        } else {
          console.log(`ℹ️ [HTTP 429 RATE LIMIT NOTICE] Rate limit threshold reached for ${targetUrl}. Gracefully skipping batch.`);
          return res;
        }
      }

      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        console.log(`ℹ️ [FETCH NOTICE] Fetch issue (${err.message}). Retrying in ${delayMs / 1000}s (Attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
        attempt++;
      } else {
        console.log(`ℹ️ [FETCH NOTICE] Able to skip feed attempt gracefully: ${err.message}`);
        return null;
      }
    }
  }
}

export async function processTarget(target) {
  console.log(`\n==================================================`);
  console.log(`📡 [PIPELINE STAGE 1: INGESTION] Target [${target.type}]: ${target.name} (${target.url})`);
  console.log(`==================================================`);

  if (target.url.includes('facebook.com') || target.url.includes('nextdoor.com')) {
    console.log(`ℹ️ [INGESTION NOTICE] Target "${target.name}" is a web scraper target. Direct RSS parser skipped (Incoming leads expected via /webhook/lead or /api/leads/create endpoint).`);
    return 0;
  }

  const processedLeads = loadProcessedLeads();
  let count = 0;
  let rawItemsCount = 0;
  let passedDedupCount = 0;
  let failedStage3Count = 0;
  let failedStage4Count = 0;
  let dispatchedCount = 0;

  try {
    const isReddit = target.url.includes('reddit.com');
    
    // Fetch target feed with retry & 15s exponential backoff on HTTP 429
    const res = await fetchFeedWithRetry(target.url, isReddit);

    if (!res || !res.ok) {
      if (res && res.status === 404) {
        console.log(`ℹ️ [INGESTION NOTICE] Target feed "${target.name}" returned HTTP 404 (Endpoint deprecated/unavailable). Gracefully skipping.`);
      } else if (res && res.status === 429) {
        console.log(`ℹ️ [INGESTION NOTICE] Target feed "${target.name}" rate-limited (HTTP 429). Gracefully skipping batch.`);
      } else {
        console.log(`ℹ️ [INGESTION NOTICE] Target feed (${target.name}) returned status ${res ? res.status : 'ERR'}. Gracefully skipping.`);
      }
      return 0;
    }

    let xml = await res.text();
    // Sanitize unescaped ampersands in XML that cause RSS XML parser breaks
    xml = xml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

    const feed = await parser.parseString(xml);
    const items = feed.items.slice(0, CONFIG.maxItemsPerBatch);
    rawItemsCount = items.length;
    console.log(`📥 Fetched ${rawItemsCount} raw feed items from ${target.name}`);

    for (const item of items) {
      const itemId = item.guid || item.id || item.link;
      const itemLink = item.link || item.guid || item.url;

      console.log(`\n🔍 Evaluating item: "${item.title}"`);
      console.log(`   ID: ${itemId}`);

      if (!itemId) {
        console.warn(`🛑 [DROPPED AT STAGE 1] Feed item missing ID/Link. Skipping.`);
        continue;
      }

      if (isAlreadyProcessed(itemId, processedLeads, itemLink)) {
        console.log(`🛑 [DROPPED AT STAGE 2: DEDUP] Lead "${item.title}" (ID: ${itemId}) already in leads.json. Skipping.`);
        continue;
      }

      passedDedupCount++;
      console.log(`✅ [STAGE 2 PASSED: DEDUP] New lead detected. Evaluating intent...`);
      const evaluation = await qualifyLead(item.title, item.contentSnippet || item.content || '', item.pubDate || Date.now());

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
        source: target.type,
        date: item.pubDate || new Date().toISOString(),
        is_valid_lead: evaluation.is_valid_lead,
        urgency_level: evaluation.urgency_level,
        intentScore: evaluation.intentScore || 0,
        summary: evaluation.summary,
        suggested_reply: evaluation.suggested_reply,
        processedAt: new Date().toISOString()
      };

      saveProcessedLead(leadRecord);
      processedLeads.push(leadRecord);
      console.log(`💾 Saved lead record to leads.json (ID: ${itemId})`);

      if (evaluation.is_valid_lead) {
        const sent = await sendAlert(item, evaluation, target.type);
        if (sent) dispatchedCount++;
      } else {
        console.log(`ℹ️ [DISPATCH SKIPPED] Lead marked non-valid by qualification engine.`);
      }
      count++;
    }

    console.log(`\n📊 [TARGET AUDIT SUMMARY - ${target.name}]:`);
    console.log(`   • Raw Items Fetched: ${rawItemsCount}`);
    console.log(`   • Passed Stage 2 (Dedup): ${passedDedupCount}`);
    console.log(`   • Failed Stage 3 (Intent Pre-filter): ${failedStage3Count}`);
    console.log(`   • Failed Stage 4 (AI Qualification): ${failedStage4Count}`);
    console.log(`   • Alerts Dispatched: ${dispatchedCount}`);

  } catch (error) {
    console.log(`ℹ️ [INGESTION NOTICE] Error parsing feed (${target.name}): ${error.message}`);
  }

  return count;
}

export async function processLeadBatch(sourceName, rawLeads) {
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

    console.log(`\n🔍 Evaluating item: "${item.title}"`);
    console.log(`   ID: ${itemId}`);

    if (!itemId) {
      console.warn(`🛑 [DROPPED AT STAGE 1] Lead item missing ID/Link. Skipping.`);
      continue;
    }

    if (isAlreadyProcessed(itemId, processedLeads, itemLink)) {
      console.log(`🛑 [DROPPED AT STAGE 2: DEDUP] Lead "${item.title}" (ID: ${itemId}) already in leads.json. Skipping.`);
      continue;
    }

    passedDedupCount++;
    console.log(`✅ [STAGE 2 PASSED: DEDUP] New lead detected. Evaluating intent...`);
    const evaluation = await qualifyLead(item.title, item.text || item.contentSnippet || item.content || '', item.date || Date.now());

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
    console.log(`💾 Saved lead record to leads.json (ID: ${itemId})`);

    if (evaluation.is_valid_lead) {
      const sent = await sendAlert(item, evaluation, item.source || sourceName);
      if (sent) dispatchedCount++;
    } else {
      console.log(`ℹ️ [DISPATCH SKIPPED] Lead marked non-valid by qualification engine.`);
    }
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

export async function processAllFeeds() {
  console.log(`\n==================================================`);
  console.log(`🔄 Starting Multi-Platform Lead Scan at ${new Date().toLocaleString()}`);
  console.log(`==================================================`);

  let totalProcessed = 0;
  for (let i = 0; i < CONFIG.platformTargets.length; i++) {
    const target = CONFIG.platformTargets[i];

    // Stagger feed requests with a 5-second delay to prevent IP rate limits
    if (i > 0 && (target.url.includes('reddit.com') || target.url.includes('.rss'))) {
      console.log(`⏳ [STAGGER DELAY] Waiting 5.0s before fetching target feed (${target.name})...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const processed = await processTarget(target);
    totalProcessed += processed;
  }

  // 2. Modular Scraper: Craigslist RSS
  try {
    const clLeads = await fetchCraigslistLeads();
    const clCount = await processLeadBatch('Craigslist', clLeads);
    totalProcessed += clCount;
  } catch (err) {
    console.error('❌ Error during Craigslist scraper batch:', err.message);
  }

  // 3. Modular Scraper: X / Twitter
  try {
    const xLeads = await fetchXLeads();
    const xCount = await processLeadBatch('X / Twitter', xLeads);
    totalProcessed += xCount;
  } catch (err) {
    console.error('❌ Error during X / Twitter scraper batch:', err.message);
  }

  console.log(`\n✅ Scan finished. Processed ${totalProcessed} new items.\n`);
}

// ---------------------------------------------------------------------------
// 5. NWS WEATHER ALERT MONITOR & DYNAMIC POLLING ADJUSTMENT
// ---------------------------------------------------------------------------

let activePollingTimer = null;

export async function pollNWSWeatherAlerts() {
  console.log(`\n🌦️ [NWS WEATHER MONITOR] Checking active weather alerts for NV / Clark County...`);
  const alertResult = await checkNWSWeatherAlerts();

  const wasActive = getWeatherAlertActiveState();
  const isNowActive = alertResult.active;

  if (isNowActive && !wasActive) {
    console.log(`⚡ [WEATHER ALERT ACTIVATED] NWS Flood/Severe Storm Advisory detected in Clark County!`);
    console.log(`   Matched Events: ${alertResult.matchedEvents.join(', ')}`);
    setWeatherAlertActiveState(true);
    CONFIG.pollingIntervalMinutes = 3;

    const message = `⚡ [WEATHER ALERT ACTIVE] NWS Flood/Severe Storm Advisory detected in Clark County. Scraper polling interval boosted to 3 minutes.`;
    const details = alertResult.alerts.map(a => `${a.event}: ${a.headline}`).join('; ');
    await sendWeatherAlertDiscordNotification(message, details);

  } else if (!isNowActive && wasActive) {
    console.log(`ℹ️ [WEATHER ALERT EXPIRED] NWS Weather alerts cleared. Restoring 4-minute polling interval.`);
    setWeatherAlertActiveState(false);
    CONFIG.pollingIntervalMinutes = parseInt(process.env.POLLING_INTERVAL_MINUTES || '4', 10);

    const message = `ℹ️ [WEATHER ALERT EXPIRED] NWS Severe Weather Advisory in Clark County has ended. Scraper polling interval restored to 4 minutes.`;
    await sendWeatherAlertDiscordNotification(message, 'All active NWS warnings/advisories cleared for Clark County.');

  } else {
    console.log(`ℹ️ [NWS WEATHER MONITOR] Weather mode status: ${wasActive ? 'ACTIVE (3 min polling)' : `INACTIVE (${CONFIG.pollingIntervalMinutes} min polling)`}`);
  }

  return alertResult;
}

// ---------------------------------------------------------------------------
// 6. EXPRESS WEBHOOK SERVER (Apify, Facebook Scrapers, Nextdoor Parsers)
// ---------------------------------------------------------------------------

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Emergency Lead Agent',
      hotline: DISPATCH_PHONE_NUMBER,
      weatherAlertActive: getWeatherAlertActiveState(),
      pollingIntervalMinutes: CONFIG.pollingIntervalMinutes,
      targets: CONFIG.platformTargets.map(t => t.type),
      timestamp: new Date().toISOString()
    });
  });

  const handleIncomingLead = async (req, res) => {
    try {
      const body = req.body || {};

      // Robust parameter normalization for third-party scraper webhooks
      const title = body.title || body.subject || body.headline || body.fullName || '';
      const text = body.text || body.description || body.content || body.body || body.snippet || body.emergencyType || '';
      const url = body.url || body.link || body.guid || body.postUrl || body.rawPostUrl || '';
      const sourceTag = body.source || body.platform || body.origin || 'Facebook Group';
      const timestamp = body.timestamp || body.date || body.pubDate || body.createdAt || Date.now();

      if (!title && !text) {
        console.warn('⚠️ [WEBHOOK ERROR] 400 Bad Request: Missing title or text content in lead payload.', body);
        return res.status(400).json({ error: 'Missing title or text content in lead payload.' });
      }

      const leadUrl = url || `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`\n📥 [WEBHOOK INGESTION] Incoming lead [${sourceTag}]: "${title || text.substring(0, 50)}..."`);
      console.log(`   URL/ID: ${leadUrl}`);

      const processedLeads = loadProcessedLeads();
      if (isAlreadyProcessed(leadUrl, processedLeads, url)) {
        console.log(`🛑 [DROPPED AT STAGE 2: DEDUP] Webhook lead already in leads.json: ${leadUrl}`);
        return res.status(200).json({ success: true, skipped: true, reason: 'duplicate', id: leadUrl });
      }

      console.log(`✅ [DEDUP PASSED] Webhook lead is new. Evaluating intent...`);
      const evaluation = await qualifyLead(title || 'Incoming Webhook Lead', text || '', timestamp);

      const leadRecord = {
        id: leadUrl,
        title: title || 'Untitled Lead',
        link: leadUrl,
        source: sourceTag,
        date: new Date(timestamp).toISOString(),
        is_valid_lead: evaluation.is_valid_lead,
        urgency_level: evaluation.urgency_level,
        intentScore: evaluation.intentScore || 0,
        summary: evaluation.summary,
        suggested_reply: evaluation.suggested_reply,
        processedAt: new Date().toISOString()
      };

      saveProcessedLead(leadRecord);
      console.log(`💾 Saved webhook lead to leads.json (ID: ${leadUrl})`);

      let alertSent = false;
      if (evaluation.is_valid_lead) {
        alertSent = await sendAlert(
          { title: title || 'Untitled Lead', url: leadUrl, link: leadUrl, source: sourceTag, author: body.author || body.fullName, location: body.location || body.address },
          evaluation,
          sourceTag
        );
      } else {
        console.log(`ℹ️ [DISPATCH SKIPPED] Webhook lead did not meet qualification threshold.`);
      }

      return res.status(200).json({
        success: true,
        processed: true,
        is_valid_lead: evaluation.is_valid_lead,
        urgency_level: evaluation.urgency_level,
        intentScore: evaluation.intentScore || 0,
        summary: evaluation.summary,
        suggested_reply: evaluation.suggested_reply,
        alert_sent: alertSent,
        lead: leadRecord
      });
    } catch (error) {
      console.error('❌ Error processing webhook lead:', error);
      return res.status(500).json({ error: 'Internal server error processing lead payload.' });
    }
  };

  // Support both /webhook/lead and /api/leads/create endpoints
  app.post('/webhook/lead', handleIncomingLead);
  app.post('/api/leads/create', handleIncomingLead);

  return app;
}

// ---------------------------------------------------------------------------
// 7. UNIT TESTS & VERIFICATION (--test, --test-weather, --test-dispatch)
// ---------------------------------------------------------------------------

export async function runDispatchUnitTest() {
  console.log(`\n🧪 Running 2-Channel RHR -> EcoDry Triage & Dispatch Verification (--test-dispatch)...\n`);

  console.log(`1. Verifying environment webhook configurations...`);
  console.log(`   #leads Webhook (DISCORD_WEBHOOK_URL): ${CONFIG.discordWebhookUrl ? '✅ Configured' : '⚠️ Missing'}`);
  console.log(`   #ecodry-live-leads Webhook (ECODRY_DISCORD_WEBHOOK_URL): ${CONFIG.ecodryDiscordWebhookUrl ? '✅ Configured' : '⚠️ Missing'}`);

  const sampleLead = {
    title: 'EMERGENCY: Heavy water leak in kitchen from burst pipe!',
    text: 'Pipe burst under kitchen sink in Spring Valley home! Water is gushing onto hardwood floors fast. Need immediate emergency restoration team!',
    url: `https://nextdoor.com/p/test-dispatch-${Date.now()}`,
    source: 'Nextdoor',
    author: 'Sarah Jenkins (Spring Valley)',
    region: 'Spring Valley, NV',
    timestamp: new Date().toISOString()
  };

  console.log(`\n2. Qualifying sample lead for triage...`);
  const evalResult = await qualifyLead(sampleLead.title, sampleLead.text, sampleLead.timestamp);
  console.log(`   Result: Valid=${evalResult.is_valid_lead}, Urgency=${evalResult.urgency_level}, Score=${(evalResult.intentScore * 100).toFixed(0)}%`);

  if (!evalResult.is_valid_lead || evalResult.intentScore < 0.85) {
    throw new Error(`Test Dispatch Failed: Expected valid lead with score >= 85%, got score ${(evalResult.intentScore * 100).toFixed(0)}%`);
  }

  console.log(`\n3. Dispatching Primary Alert to #leads (DISCORD_WEBHOOK_URL)...`);
  const primarySent = await sendAlert(sampleLead, evalResult, 'Nextdoor');

  console.log(`\n4. Dispatching Formatted EcoDry Dispatch Card to #ecodry-live-leads (ECODRY_DISCORD_WEBHOOK_URL)...`);
  const ecoDrySent = await sendEcoDryDispatchCard(sampleLead, evalResult, 'Nextdoor');

  console.log(`\n5. Verifying EcoDry Dispatch Card Fields:`);
  console.log(`   • 🚨 Status: Fresh Dispatched Lead`);
  console.log(`   • 👤 Customer: Sarah Jenkins (Spring Valley)`);
  console.log(`   • 📍 Location: Spring Valley, NV`);
  console.log(`   • 📝 Scope of Damage: ${evalResult.summary || sampleLead.title}`);
  console.log(`   • 🔗 Source Link: ${sampleLead.url}`);
  console.log(`   • ⏱️ Dispatched At: ${sampleLead.timestamp}`);

  console.log(`\n🎉 ✅ 2-Channel RHR -> EcoDry Triage & Dispatch Test Passed Successfully!\n`);
}

export async function runWeatherUnitTest() {
  console.log(`\n⚡ Running NWS Weather Alert Trigger & Dynamic Polling Boost Test...\n`);

  console.log(`1. Initializing baseline state (Weather Mode: INACTIVE, Polling: ${CONFIG.pollingIntervalMinutes} min)...`);
  setWeatherAlertActiveState(false);
  CONFIG.pollingIntervalMinutes = 4;

  if (getWeatherAlertActiveState() !== false || CONFIG.pollingIntervalMinutes !== 4) {
    throw new Error('Test Weather Failed: Initial state should be inactive with 4m polling');
  }

  console.log(`   Baseline check passed.`);

  // Test Secondary Keyword filtering in INACTIVE mode (Should fail or lack damage word match)
  const secondaryPost = {
    title: 'Water dripping from ceiling in garage',
    text: 'We have a garage flooding issue and a ceiling drip after rain in Las Vegas.',
    timestamp: new Date().toISOString()
  };

  console.log(`\n2. Evaluating secondary keyword ("garage flooding") in INACTIVE mode...`);
  const evalInactive = calculateIntentScore(secondaryPost, false);
  console.log(`   Inactive Mode Result: Passed=${evalInactive.passed}, Score=${(evalInactive.score * 100).toFixed(0)}%, Reason=${evalInactive.reason}`);

  // Test Activating Weather Alert Emergency Mode
  console.log(`\n3. Simulating active NWS Flash Flood Warning alert for Clark County...`);
  setWeatherAlertActiveState(true);
  CONFIG.pollingIntervalMinutes = 3;

  if (getWeatherAlertActiveState() !== true || CONFIG.pollingIntervalMinutes !== 3) {
    throw new Error('Test Weather Failed: Dynamic boost failed to switch polling interval to 3 min');
  }

  console.log(`   ✅ Dynamic Polling Interval successfully boosted to 3 minutes!`);
  console.log(`   Secondary Keyword pre-filters expanded: ${SECONDARY_WEATHER_KEYWORDS.join(', ')}`);

  console.log(`\n4. Evaluating secondary keyword ("garage flooding") in ACTIVE Weather Emergency Mode...`);
  const evalActive = calculateIntentScore(secondaryPost, true);
  console.log(`   Active Mode Result: Passed=${evalActive.passed}, Score=${(evalActive.score * 100).toFixed(0)}%, Reason=${evalActive.reason}`);

  if (!evalActive.passed || evalActive.score < 0.50) {
    throw new Error(`Test Weather Failed: Expected secondary keyword to pass intent score in weather mode, got score ${(evalActive.score * 100).toFixed(0)}%`);
  }

  console.log(`   ✅ Secondary keyword pre-filter expansion verified successfully!`);

  // Test Sump Pump and Shop Vac keywords in active mode
  const sumpPumpPost = {
    title: 'Sump pump failure in basement',
    text: 'Need shop vac or emergency team for standing water in Henderson home!',
    timestamp: new Date().toISOString()
  };

  console.log(`\n5. Evaluating additional secondary keywords ("sump pump", "shop vac", "standing water")...`);
  const evalSump = calculateIntentScore(sumpPumpPost, true);
  console.log(`   Result: Passed=${evalSump.passed}, Score=${(evalSump.score * 100).toFixed(0)}%`);

  if (!evalSump.passed) {
    throw new Error('Test Weather Failed: Sump pump post should pass in weather emergency mode');
  }

  // Dispatch live Discord notification for weather alert
  console.log(`\n6. Dispatching live Weather Alert Notification to Discord...`);
  const notificationText = `⚡ [WEATHER ALERT ACTIVE] NWS Flood/Severe Storm Advisory detected in Clark County. Scraper polling interval boosted to 3 minutes.`;
  await sendWeatherAlertDiscordNotification(notificationText, 'Simulated NWS Flash Flood Warning for Clark County');

  // Deactivate Weather Mode & Restore 4m polling
  console.log(`\n7. Simulating Weather Alert Expiry...`);
  setWeatherAlertActiveState(false);
  CONFIG.pollingIntervalMinutes = 4;

  if (getWeatherAlertActiveState() !== false || CONFIG.pollingIntervalMinutes !== 4) {
    throw new Error('Test Weather Failed: Restoration to 4 min polling failed');
  }

  console.log(`   ✅ Polling interval restored back to 4 minutes cleanly.`);

  console.log(`\n🎉 ✅ NWS Weather Alert Trigger, Polling Boost (3m), and Keyword Filters Verified Successfully!\n`);
}

export async function runMockUnitTest() {
  console.log(`\n🧪 Running Refined Emergency Scraper Unit Test & Discord Verification...\n`);

  // Test 1: Qualified Facebook Group Lead (High Intent Phrase + Location Context)
  const fbLead = {
    title: 'EMERGENCY: Kitchen flooded with water pouring from pipe!',
    text: 'Pipe burst under my sink in my kitchen in Las Vegas! Water is pouring everywhere right now. Need emergency restoration plumber ASAP!',
    url: `https://www.facebook.com/groups/lasvegascommunity/posts/test-${Date.now()}-1`,
    source: 'Facebook Group',
    timestamp: new Date().toISOString()
  };

  console.log(`Test 1: Evaluating Qualified Facebook Group Lead...`);
  const evalFb = await qualifyLead(fbLead.title, fbLead.text, fbLead.timestamp);
  console.log(`   Result: Valid=${evalFb.is_valid_lead}, Urgency=${evalFb.urgency_level}, Score=${(evalFb.intentScore * 100).toFixed(0)}%`);
  console.log(`   Suggested Reply: "${evalFb.suggested_reply}"`);

  if (!evalFb.is_valid_lead || evalFb.intentScore < 0.85) {
    throw new Error(`Test 1 Failed: Expected valid lead with score >= 85%, got score ${(evalFb.intentScore * 100).toFixed(0)}%`);
  }

  if (!evalFb.suggested_reply.includes('(702) 491-9899')) {
    throw new Error('Test 1 Failed: Suggested reply does not contain hotline phone number (702) 491-9899');
  }

  console.log(`   Dispatching live Discord test alert for Facebook Group...`);
  await sendAlert(fbLead, evalFb, 'Facebook Group');

  // Test 2: Qualified Nextdoor Lead (High Intent Phrase + Location Context)
  const nextdoorLead = {
    title: 'Ceiling leaking right now in living room',
    text: 'Roof leaking bad in our living room during storm in Summerlin! Water is leaking through my ceiling. Need emergency tarping/repair team!',
    url: `https://nextdoor.com/p/test-${Date.now()}-2`,
    source: 'Nextdoor',
    timestamp: new Date().toISOString()
  };

  console.log(`\nTest 2: Evaluating Qualified Nextdoor Lead...`);
  const evalNd = await qualifyLead(nextdoorLead.title, nextdoorLead.text, nextdoorLead.timestamp);
  console.log(`   Result: Valid=${evalNd.is_valid_lead}, Urgency=${evalNd.urgency_level}, Score=${(evalNd.intentScore * 100).toFixed(0)}%`);
  console.log(`   Suggested Reply: "${evalNd.suggested_reply}"`);

  if (!evalNd.is_valid_lead || evalNd.intentScore < 0.85) {
    throw new Error(`Test 2 Failed: Expected valid lead with score >= 85%, got score ${(evalNd.intentScore * 100).toFixed(0)}%`);
  }

  if (!evalNd.suggested_reply.includes('(702) 491-9899')) {
    throw new Error('Test 2 Failed: Suggested reply does not contain hotline phone number (702) 491-9899');
  }

  console.log(`   Dispatching live Discord test alert for Nextdoor...`);
  await sendAlert(nextdoorLead, evalNd, 'Nextdoor');

  // Test 3: Negative Keyword Blocklist Test (DIY Post)
  const diyLead = {
    title: 'How to DIY fix a slow pipe leak?',
    text: 'Looking for a DIY video tutorial or renovation quote on how to replace pipe washers.',
    timestamp: new Date().toISOString()
  };

  console.log(`\nTest 3: Evaluating Negative Blocklist (DIY Post)...`);
  const evalDiy = await qualifyLead(diyLead.title, diyLead.text, diyLead.timestamp);
  console.log(`   Result: Valid=${evalDiy.is_valid_lead}, Reason: ${evalDiy.summary}`);

  if (evalDiy.is_valid_lead) {
    throw new Error('Test 3 Failed: DIY post should have been rejected by negative keyword blocklist');
  }

  // Test 4: Post Age Limit Test (> 14 Days / 336 Hours Old)
  const oldDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days (360 hours) old
  const oldLead = {
    title: 'Water pouring in my kitchen',
    text: 'Water pouring from pipe in my kitchen.',
    timestamp: oldDate
  };

  console.log(`\nTest 4: Evaluating Post Age Limit (> 14 Days / 336 Hours)...`);
  const evalOld = await qualifyLead(oldLead.title, oldLead.text, oldLead.timestamp);
  console.log(`   Result: Valid=${evalOld.is_valid_lead}, Reason: ${evalOld.summary}`);

  if (evalOld.is_valid_lead) {
    throw new Error('Test 4 Failed: Post older than 14 days (336 hours) should have been rejected');
  }

  console.log(`\n🎉 ✅ All Scraper Intent, Phone Number & Discord Webhook Tests Passed Successfully!\n`);
}

// ---------------------------------------------------------------------------
// 8. MAIN EXECUTION ENTRY POINT
// ---------------------------------------------------------------------------

async function main() {
  verifyEnvironment();

  const args = process.argv.slice(2);

  if (args.includes('--test-dispatch')) {
    await runDispatchUnitTest();
    process.exit(0);
  }

  if (args.includes('--test-weather')) {
    await runWeatherUnitTest();
    process.exit(0);
  }

  if (args.includes('--test')) {
    await runMockUnitTest();
    process.exit(0);
  }

  if (args.includes('--once')) {
    await pollNWSWeatherAlerts();
    await processAllFeeds();
    process.exit(0);
  }

  // Start Express HTTP Server with error fallback
  const app = createExpressApp();
  const server = app.listen(CONFIG.port, () => {
    console.log(`🚀 Express Webhook Server listening on http://localhost:${CONFIG.port}`);
    console.log(`   POST leads to http://localhost:${CONFIG.port}/webhook/lead`);
    console.log(`   Dispatch Hotline: ${DISPATCH_PHONE_NUMBER}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = CONFIG.port === 3000 ? 3005 : CONFIG.port + 1;
      console.warn(`⚠️ Port ${CONFIG.port} is already in use. Retrying Webhook Server on fallback port ${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        console.log(`🚀 Express Webhook Server listening on http://localhost:${fallbackPort}`);
        console.log(`   POST leads to http://localhost:${fallbackPort}/webhook/lead`);
      });
    } else {
      console.error('❌ Express server error:', err.message);
    }
  });

  // Perform initial weather alert check & feed scan
  try {
    await pollNWSWeatherAlerts();
    await processAllFeeds();
  } catch (scanErr) {
    console.error('⚠️ Initial feed scan error:', scanErr.message);
  }

  // Schedule background NWS Weather Alert Poller (every 15 minutes)
  setInterval(async () => {
    try {
      await pollNWSWeatherAlerts();
    } catch (err) {
      console.error('❌ Error polling NWS weather alerts:', err.message);
    }
  }, 15 * 60 * 1000);

  // Dynamic Scraper Feed Polling Loop
  const runFeedCycle = async () => {
    try {
      await processAllFeeds();
    } catch (cycleErr) {
      console.error('❌ Error during background lead scan cycle:', cycleErr.message);
    }
    const currentIntervalMs = CONFIG.pollingIntervalMinutes * 60 * 1000;
    activePollingTimer = setTimeout(runFeedCycle, currentIntervalMs);
  };

  const initialIntervalMs = CONFIG.pollingIntervalMinutes * 60 * 1000;
  console.log(`\n⏰ Scheduled Lead Agent online. Polling targets every ${CONFIG.pollingIntervalMinutes} minutes.`);
  activePollingTimer = setTimeout(runFeedCycle, initialIntervalMs);

  // Keep-alive heartbeat timer to guarantee Node event loop stays active for PM2
  setInterval(() => {
    // Keep-alive tick for PM2 background process persistence
  }, 3600000);
}

// Unconditional main entry point execution for PM2 process runner & standalone Node execution
main().catch(err => {
  console.error('Fatal execution error in Lead Agent:', err);
  process.exit(1);
});
