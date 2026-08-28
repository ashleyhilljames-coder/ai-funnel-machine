/**
 * Emergency Scraper Module (TypeScript Interface Definition)
 */
import fs from 'fs';
import path from 'path';

export const DISPATCH_PHONE_NUMBER = "(702) 491-9899";

export function formatSuggestedReply(summary: string = "property emergency"): string {
  const cleanSummary = String(summary)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .trim();

  return `We understand you're dealing with an urgent ${cleanSummary || 'home emergency'}! Our emergency restoration team is available right now with our 90-Minute Arrival Guarantee. Call or text us immediately at ${DISPATCH_PHONE_NUMBER} for rapid relief.`;
}

export interface PlatformTarget {
  name: string;
  type: string;
  url: string;
  description: string;
  region?: string;
}

export interface PostPayload {
  title: string;
  text?: string;
  contentSnippet?: string;
  content?: string;
  url?: string;
  link?: string;
  source?: string;
  timestamp?: string | number | Date;
  pubDate?: string;
}

export interface IntentScoreResult {
  score: number;
  passed: boolean;
  hasHighIntentPhrase?: boolean;
  hasActiveDamageWord?: boolean;
  hasLocationContext?: boolean;
  reason: string;
}

export interface NWSAlert {
  event: string;
  headline: string;
  areaDesc: string;
  description: string;
  expires: string;
}

export interface NWSAlertCheckResult {
  active: boolean;
  alerts: NWSAlert[];
  matchedEvents: string[];
}

export const TARGET_WEATHER_EVENTS = [
  "Flood Warning",
  "Flood Advisory",
  "Flash Flood Warning",
  "Severe Thunderstorm Warning"
];

export const SECONDARY_WEATHER_KEYWORDS: string[] = [
  "garage flooding",
  "ceiling drip",
  "roof leak",
  "sump pump",
  "shop vac",
  "standing water"
];

let isWeatherAlertActiveMode = false;

export function setWeatherAlertActiveState(active: boolean): void {
  isWeatherAlertActiveMode = active;
}

export function getWeatherAlertActiveState(): boolean {
  return isWeatherAlertActiveMode;
}

export const DEFAULT_PLATFORM_TARGETS: PlatformTarget[] = [
  {
    name: 'Facebook Groups',
    type: 'Facebook Group',
    url: 'https://www.facebook.com/groups/lasvegascommunity/',
    description: 'Local Las Vegas Community & Classifieds Facebook Group',
    region: 'Las Vegas'
  },
  {
    name: 'Nextdoor Neighborhood',
    type: 'Nextdoor',
    url: 'https://nextdoor.com/city/las-vegas--nv/',
    description: 'Las Vegas Neighborhood Feed',
    region: 'Las Vegas'
  },
  {
    name: 'Greater Vegas Regional Reddit Classifieds',
    type: 'Reddit',
    url: 'https://www.reddit.com/r/LasVegas+HendersonNV+NorthLasVegas+SpringValleyNV+CentennialHills/search.rss?q=plumber+OR+leak+OR+flood+OR+repair&restrict_sr=1&sort=new',
    description: 'Consolidated Greater Vegas Regional Subreddits Service Requests',
    region: 'Clark County'
  }
];

export function loadPlatformTargets(): PlatformTarget[] {
  try {
    const configPath = path.join(process.cwd(), 'config', 'targets.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Could not load targets from config/targets.json, using defaults:', err.message);
  }
  return DEFAULT_PLATFORM_TARGETS;
}

export const PLATFORM_TARGETS: PlatformTarget[] = loadPlatformTargets();

export const HIGH_INTENT_PHRASES: string[] = [
  "water pouring",
  "pipe burst",
  "kitchen flooded",
  "ceiling leaking right now",
  "standing water in garage",
  "need emergency restoration",
  "sewer backing up",
  "roof leaking bad"
];

export const NEGATIVE_BLOCKLIST: string[] = [
  "news",
  "article",
  "forecast",
  "diy",
  "how to",
  "renovation",
  "remodel",
  "recommendation for future",
  "hiring soon",
  "quote"
];

export const ACTIVE_DAMAGE_WORDS: string[] = [
  "water", "leak", "leaking", "pipe", "flood", "flooding", "flooded",
  "sewer", "roof", "burst", "restoration", "pouring", "mitigation", "mold", "mould", "damage"
];

export const LOCATION_CONTEXTS: string[] = [
  "my kitchen", "our garage", "my ceiling", "my basement", "our house",
  "my bathroom", "our living room", "my roof", "in my home", "my main line",
  "my property", "our home", "my yard", "garage", "ceiling", "attic", "hallway", "basement", "home", "house"
];

export async function checkNWSWeatherAlerts(): Promise<NWSAlertCheckResult> {
  const url = 'https://api.weather.gov/alerts/active?area=NV';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': '(EmergencyLeadAgent/1.0, contact@emergencyrestoration.com)'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ [NWS ALERT SCAN] NWS API returned status ${response.status}`);
      return { active: false, alerts: [], matchedEvents: [] };
    }

    const data: any = await response.json();
    const features = data?.features || [];

    const activeAlerts: NWSAlert[] = [];
    const matchedEvents = new Set<string>();

    for (const feature of features) {
      const props = feature?.properties || {};
      const eventName = props.event || '';
      const areaDesc = (props.areaDesc || '').toLowerCase();
      const headline = (props.headline || '').toLowerCase();
      const description = (props.description || '').toLowerCase();

      const isTargetEvent = TARGET_WEATHER_EVENTS.some(evt =>
        eventName.toLowerCase().includes(evt.toLowerCase())
      );

      const mentionsTargetArea =
        areaDesc.includes('clark') ||
        areaDesc.includes('las vegas') ||
        areaDesc.includes('henderson') ||
        areaDesc.includes('north las vegas') ||
        headline.includes('clark') ||
        headline.includes('las vegas') ||
        description.includes('clark county') ||
        description.includes('las vegas');

      if (isTargetEvent && mentionsTargetArea) {
        activeAlerts.push({
          event: props.event,
          headline: props.headline || '',
          areaDesc: props.areaDesc || '',
          description: props.description || '',
          expires: props.expires || ''
        });
        matchedEvents.add(props.event);
      }
    }

    const isActive = activeAlerts.length > 0;
    return {
      active: isActive,
      alerts: activeAlerts,
      matchedEvents: Array.from(matchedEvents)
    };
  } catch (error: any) {
    console.error('❌ [NWS ALERT SCAN ERROR]', error.message);
    return { active: false, alerts: [], matchedEvents: [] };
  }
}

export function calculateIntentScore(post: PostPayload, isWeatherActiveOverride?: boolean): IntentScoreResult {
  const title = post.title || '';
  const text = post.text || post.contentSnippet || post.content || '';
  const timestamp = post.timestamp || post.pubDate || new Date().toISOString();

  const fullText = `${title} ${text}`.toLowerCase();

  const postDate = new Date(timestamp);
  const now = new Date();
  const ageHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  if (isNaN(postDate.getTime()) || ageHours > 336) {
    return {
      score: 0,
      passed: false,
      reason: `Rejected: Post is older than 14 days (336 hours) (${isNaN(ageHours) ? 'Invalid Date' : ageHours.toFixed(1) + 'h old'})`
    };
  }

  for (const blockWord of NEGATIVE_BLOCKLIST) {
    const regex = new RegExp(`\\b${blockWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(fullText)) {
      return {
        score: 0,
        passed: false,
        reason: `Rejected: Contains blocklist word "${blockWord}"`
      };
    }
  }

  const isWeatherActive = isWeatherActiveOverride !== undefined ? isWeatherActiveOverride : isWeatherAlertActiveMode;

  let damageWordsToUse = [...ACTIVE_DAMAGE_WORDS];
  let highIntentPhrasesToUse = [...HIGH_INTENT_PHRASES];

  if (isWeatherActive) {
    damageWordsToUse = [...damageWordsToUse, ...SECONDARY_WEATHER_KEYWORDS];
    highIntentPhrasesToUse = [...highIntentPhrasesToUse, ...SECONDARY_WEATHER_KEYWORDS];
  }

  let hasHighIntentPhrase = false;
  for (const phrase of highIntentPhrasesToUse) {
    if (fullText.includes(phrase.toLowerCase())) {
      hasHighIntentPhrase = true;
      break;
    }
  }

  let hasActiveDamageWord = hasHighIntentPhrase;
  if (!hasActiveDamageWord) {
    for (const word of damageWordsToUse) {
      if (word.includes(' ')) {
        if (fullText.includes(word.toLowerCase())) {
          hasActiveDamageWord = true;
          break;
        }
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(fullText)) {
          hasActiveDamageWord = true;
          break;
        }
      }
    }
  }

  let hasLocationContext = false;
  for (const loc of LOCATION_CONTEXTS) {
    if (fullText.includes(loc.toLowerCase())) {
      hasLocationContext = true;
      break;
    }
  }

  let score = 0.0;
  if (hasHighIntentPhrase) {
    score += 0.50;
  } else if (hasActiveDamageWord) {
    score += 0.45;
  }

  if (hasLocationContext) {
    score += 0.45;
  }

  if (isWeatherActive && (hasHighIntentPhrase || hasActiveDamageWord)) {
    score = Math.max(score, 0.85);
  }

  score = Math.min(1.0, Math.round(score * 100) / 100);

  const minRequiredScore = isWeatherActive ? 0.50 : 0.85;
  const passed = score >= minRequiredScore && hasActiveDamageWord && (hasLocationContext || isWeatherActive);

  return {
    score,
    passed,
    hasHighIntentPhrase,
    hasActiveDamageWord,
    hasLocationContext,
    reason: passed
      ? `Qualified: Score ${(score * 100).toFixed(0)}% meets ${isWeatherActive ? '50%' : '85%'} threshold${isWeatherActive ? ' (Weather Mode Active)' : ''}`
      : `Rejected: Score ${(score * 100).toFixed(0)}% below ${isWeatherActive ? '50%' : '85%'} threshold or missing location/damage context`
  };
}
