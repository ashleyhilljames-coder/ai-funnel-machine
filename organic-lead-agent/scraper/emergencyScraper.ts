/**
 * Emergency Scraper Module (TypeScript Interface Definition)
 */

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

export const PLATFORM_TARGETS: PlatformTarget[] = [
  {
    name: 'Facebook Groups',
    type: 'Facebook Group',
    url: 'https://www.facebook.com/groups/lasvegascommunity/',
    description: 'Local Las Vegas Community & Classifieds Facebook Group'
  },
  {
    name: 'Nextdoor Neighborhood',
    type: 'Nextdoor',
    url: 'https://nextdoor.com/city/las-vegas--nv/',
    description: 'Las Vegas Neighborhood Feed'
  },
  {
    name: 'Public Incident Logs',
    type: 'Public Incident Log',
    url: 'https://www.lasvegasnevada.gov/api/incidents.rss',
    description: 'City Emergency Public Service Incident Log'
  },
  {
    name: 'Reddit Classifieds',
    type: 'Reddit',
    url: 'https://www.reddit.com/r/LasVegas/search.rss?q=plumber+OR+leak+OR+flood+OR+repair&restrict_sr=1&sort=new',
    description: 'Subreddit Local Service Requests'
  }
];

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
  "weather",
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
  "my property", "our home", "my yard"
];

export function calculateIntentScore(post: PostPayload): IntentScoreResult {
  const title = post.title || '';
  const text = post.text || post.contentSnippet || post.content || '';
  const timestamp = post.timestamp || post.pubDate || new Date().toISOString();

  const fullText = `${title} ${text}`.toLowerCase();

  const postDate = new Date(timestamp);
  const now = new Date();
  const ageHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  if (isNaN(postDate.getTime()) || ageHours > 24) {
    return {
      score: 0,
      passed: false,
      reason: `Rejected: Post is older than 24 hours (${isNaN(ageHours) ? 'Invalid Date' : ageHours.toFixed(1) + 'h old'})`
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

  let hasHighIntentPhrase = false;
  for (const phrase of HIGH_INTENT_PHRASES) {
    if (fullText.includes(phrase.toLowerCase())) {
      hasHighIntentPhrase = true;
      break;
    }
  }

  let hasActiveDamageWord = hasHighIntentPhrase;
  if (!hasActiveDamageWord) {
    for (const word of ACTIVE_DAMAGE_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(fullText)) {
        hasActiveDamageWord = true;
        break;
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

  score = Math.min(1.0, Math.round(score * 100) / 100);

  const passed = score >= 0.85 && hasActiveDamageWord && hasLocationContext;

  return {
    score,
    passed,
    hasHighIntentPhrase,
    hasActiveDamageWord,
    hasLocationContext,
    reason: passed
      ? `Qualified: Score ${(score * 100).toFixed(0)}% meets 85% threshold`
      : `Rejected: Score ${(score * 100).toFixed(0)}% below 85% threshold or missing location/damage context`
  };
}
