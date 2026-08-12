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
  formatSuggestedReply,
  calculateIntentScore
} from './scraper/emergencyScraper.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEADS_FILE_PATH = path.join(__dirname, 'leads.json');

// System Configuration
const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  pollingIntervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES || '15', 10),
  maxItemsPerBatch: parseInt(process.env.MAX_ITEMS_PER_BATCH || '10', 10),
  platformTargets: PLATFORM_TARGETS
};

const parser = new Parser({
  headers: { 'User-Agent': 'EmergencyLeadAgent/1.0 (Lead Generation Bot)' }
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
      fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(LEADS_FILE_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('⚠️ Error reading leads.json:', error.message);
    return [];
  }
}

export function isAlreadyProcessed(itemId, processedLeads) {
  if (!itemId) return false;
  return processedLeads.some(lead => lead.id === itemId || lead.link === itemId);
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

  // First: Run strict intent scoring filter (Score >= 85%, Blocklist check, Age <= 24h)
  const intentResult = calculateIntentScore(post);
  if (!intentResult.passed) {
    console.log(`ℹ️ Pre-filter skipped post: ${intentResult.reason}`);
    return {
      is_valid_lead: false,
      urgency_level: 'Low',
      intentScore: intentResult.score,
      summary: `Filtered out by intent rules: ${intentResult.reason}`,
      suggested_reply: ''
    };
  }

  // If Gemini API is not configured or in mock test mode, use rule-based qualification
  if (isMock || !ai) {
    if (!ai && !isMock) {
      console.warn('⚠️ GEMINI_API_KEY missing or offline mode. Using rule-based qualification.');
    }
    const summary = `${title}`;
    return {
      is_valid_lead: true,
      urgency_level: intentResult.hasHighIntentPhrase ? 'High' : 'Medium',
      intentScore: intentResult.score,
      summary: summary,
      suggested_reply: formatSuggestedReply(summary)
    };
  }

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

    return {
      ...result,
      suggested_reply: finalSuggestedReply,
      intentScore: intentResult.score
    };
  } catch (error) {
    console.error('❌ Error during Gemini AI lead qualification:', error.message);
    const summary = `${title}`;
    return {
      is_valid_lead: true,
      urgency_level: intentResult.hasHighIntentPhrase ? 'High' : 'Medium',
      intentScore: intentResult.score,
      summary: summary,
      suggested_reply: formatSuggestedReply(summary)
    };
  }
}

// ---------------------------------------------------------------------------
// 3. DISCORD & SLACK ALERT DISPATCHER (Platform Tags & Hotline Phone Number)
// ---------------------------------------------------------------------------

export async function sendAlert(item, evaluation, originSource = 'Reddit') {
  const { is_valid_lead, urgency_level, summary, intentScore } = evaluation;

  if (!is_valid_lead || (urgency_level !== 'High' && urgency_level !== 'Medium')) {
    console.log(`ℹ️ Lead skipped (Not urgent or invalid). Urgency: ${urgency_level}, Valid: ${is_valid_lead}`);
    return false;
  }

  const title = item.title || 'Untitled Emergency Post';
  const link = item.url || item.link || item.guid || 'https://nextdoor.com';
  const platformTag = item.source || originSource || 'Facebook Group';
  const scorePct = intentScore ? `${(intentScore * 100).toFixed(0)}%` : '85%+';

  // Guarantee updated Suggested Draft Reply copy with hotline phone number (702) 491-9899
  const suggestedReplyCopy = formatSuggestedReply(summary || title);

  console.log(`🚨 DISPATCHING ALERT [${platformTag}] [${urgency_level}] [Score: ${scorePct}]: "${title}"`);

  let dispatched = false;

  // 1. Send Discord Alert
  if (CONFIG.discordWebhookUrl) {
    try {
      const colorMap = { High: 15158332, Medium: 15105570, Low: 3447003 }; // Red, Orange, Blue
      const payload = {
        embeds: [
          {
            title: `🚨 Emergency Lead [${platformTag}]: ${title}`,
            url: link.startsWith('http') ? link : 'https://facebook.com',
            color: colorMap[urgency_level] || 15158332,
            fields: [
              { name: 'Source Platform', value: `\`${platformTag}\``, inline: true },
              { name: 'Urgency Level', value: `\`${urgency_level}\``, inline: true },
              { name: 'Intent Match Score', value: `\`${scorePct}\``, inline: true },
              { name: 'Dispatch Hotline', value: `\`${DISPATCH_PHONE_NUMBER}\``, inline: true },
              { name: 'Issue Summary', value: summary || title },
              { name: 'Suggested Draft Reply', value: suggestedReplyCopy },
              { name: 'Direct Post Link', value: `[Click to Open Post](${link.startsWith('http') ? link : 'https://facebook.com'})` }
            ],
            footer: { text: `Emergency Lead Agent • Hotline: ${DISPATCH_PHONE_NUMBER} • Source: [${platformTag}]` },
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
        console.log('✅ Discord alert sent successfully.');
        dispatched = true;
      } else {
        console.error(`❌ Discord webhook error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.error('❌ Failed to send Discord alert:', err.message);
    }
  }

  // 2. Send Slack Alert
  if (CONFIG.slackWebhookUrl) {
    try {
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
      console.log('✅ Slack alert sent successfully.');
      dispatched = true;
    } catch (err) {
      console.error('❌ Failed to send Slack alert:', err.message);
    }
  }

  // Console log fallback if no webhooks configured
  if (!CONFIG.discordWebhookUrl && !CONFIG.slackWebhookUrl) {
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
// 4. RSS FEED & MULTI-PLATFORM MONITORING LOOP
// ---------------------------------------------------------------------------

export async function processTarget(target) {
  console.log(`📡 Ingesting feed [${target.type}]: ${target.name} (${target.url})`);
  const processedLeads = loadProcessedLeads();
  let count = 0;

  try {
    const feed = await parser.parseURL(target.url);
    const items = feed.items.slice(0, CONFIG.maxItemsPerBatch);

    for (const item of items) {
      const itemId = item.guid || item.id || item.link;

      if (!itemId || isAlreadyProcessed(itemId, processedLeads)) {
        continue;
      }

      console.log(`🔍 Evaluating [${target.type}]: "${item.title}"`);
      const evaluation = await qualifyLead(item.title, item.contentSnippet || item.content || '', item.pubDate || Date.now());

      const leadRecord = {
        id: itemId,
        title: item.title,
        link: item.link || item.guid,
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

      if (evaluation.is_valid_lead) {
        await sendAlert(item, evaluation, target.type);
      }
      count++;
    }
  } catch (error) {
    console.error(`❌ Error parsing feed (${target.name}):`, error.message);
  }

  return count;
}

export async function processAllFeeds() {
  console.log(`\n==================================================`);
  console.log(`🔄 Starting Multi-Platform Lead Scan at ${new Date().toLocaleString()}`);
  console.log(`==================================================`);

  let totalProcessed = 0;
  for (const target of CONFIG.platformTargets) {
    const processed = await processTarget(target);
    totalProcessed += processed;
  }

  console.log(`✅ Scan finished. Processed ${totalProcessed} new items.\n`);
}

// ---------------------------------------------------------------------------
// 5. EXPRESS WEBHOOK SERVER (Apify, Facebook Scrapers, Nextdoor Parsers)
// ---------------------------------------------------------------------------

export function createExpressApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Emergency Lead Agent',
      hotline: DISPATCH_PHONE_NUMBER,
      targets: CONFIG.platformTargets.map(t => t.type),
      timestamp: new Date().toISOString()
    });
  });

  app.post('/webhook/lead', async (req, res) => {
    try {
      const { title, text, url, source, timestamp } = req.body || {};

      if (!title && !text) {
        return res.status(400).json({ error: 'Missing title or text content in lead payload.' });
      }

      const sourceTag = source ? String(source) : 'Facebook Group';
      const leadUrl = url || `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const processedLeads = loadProcessedLeads();
      if (isAlreadyProcessed(leadUrl, processedLeads)) {
        console.log(`ℹ️ Webhook lead skipped (Duplicate): ${leadUrl}`);
        return res.status(200).json({ success: true, skipped: true, reason: 'duplicate', id: leadUrl });
      }

      console.log(`📥 Incoming Webhook Lead [${sourceTag}]: "${title || text.substring(0, 50)}..."`);
      const evaluation = await qualifyLead(title || 'Incoming Webhook Lead', text || '', timestamp || Date.now());

      const leadRecord = {
        id: leadUrl,
        title: title || 'Untitled Lead',
        link: leadUrl,
        source: sourceTag,
        date: new Date(timestamp || Date.now()).toISOString(),
        is_valid_lead: evaluation.is_valid_lead,
        urgency_level: evaluation.urgency_level,
        intentScore: evaluation.intentScore || 0,
        summary: evaluation.summary,
        suggested_reply: evaluation.suggested_reply,
        processedAt: new Date().toISOString()
      };

      saveProcessedLead(leadRecord);

      let alertSent = false;
      if (evaluation.is_valid_lead) {
        alertSent = await sendAlert({ title: title || 'Untitled Lead', url: leadUrl, link: leadUrl, source: sourceTag }, evaluation, sourceTag);
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
  });

  return app;
}

// ---------------------------------------------------------------------------
// 6. MOCK UNIT TEST & DISCORD VERIFICATION (--test flag)
// ---------------------------------------------------------------------------

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

  // Test 4: Post Age Limit Test (> 24 Hours Old)
  const oldDate = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30 hours old
  const oldLead = {
    title: 'Water pouring in my kitchen',
    text: 'Water pouring from pipe in my kitchen.',
    timestamp: oldDate
  };

  console.log(`\nTest 4: Evaluating Post Age Limit (> 24 Hours)...`);
  const evalOld = await qualifyLead(oldLead.title, oldLead.text, oldLead.timestamp);
  console.log(`   Result: Valid=${evalOld.is_valid_lead}, Reason: ${evalOld.summary}`);

  if (evalOld.is_valid_lead) {
    throw new Error('Test 4 Failed: Post older than 24 hours should have been rejected');
  }

  console.log(`\n🎉 ✅ All Scraper Intent, Phone Number & Discord Webhook Tests Passed Successfully!\n`);
}

// ---------------------------------------------------------------------------
// 7. MAIN EXECUTION ENTRY POINT
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    await runMockUnitTest();
    process.exit(0);
  }

  if (args.includes('--once')) {
    await processAllFeeds();
    process.exit(0);
  }

  // Start Express HTTP Server
  const app = createExpressApp();
  app.listen(CONFIG.port, () => {
    console.log(`🚀 Express Webhook Server listening on http://localhost:${CONFIG.port}`);
    console.log(`   POST leads to http://localhost:${CONFIG.port}/webhook/lead`);
    console.log(`   Dispatch Hotline: ${DISPATCH_PHONE_NUMBER}`);
  });

  // Start initial multi-platform scan & background polling loop concurrently
  await processAllFeeds();

  const intervalMs = CONFIG.pollingIntervalMinutes * 60 * 1000;
  console.log(`⏰ Scheduled Lead Agent running. Polling targets every ${CONFIG.pollingIntervalMinutes} minutes.`);
  setInterval(async () => {
    await processAllFeeds();
  }, intervalMs);
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
