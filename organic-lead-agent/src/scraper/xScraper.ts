import Parser from 'rss-parser';

export interface XLead {
  id: string;
  title: string;
  link: string;
  source: string;
  date: string;
  text?: string;
}

export const X_SCRAPER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9'
};

const parser = new Parser({
  headers: X_SCRAPER_HEADERS
});

export const X_RSS_ENDPOINTS = [
  'https://news.google.com/rss/search?q=site:x.com+las+vegas+(flood+OR+pipe+burst+OR+water+leak)',
  'https://news.google.com/rss/search?q=site:twitter.com+las+vegas+(flood+OR+pipe+burst+OR+water+leak)',
  'https://news.google.com/rss/search?q=site:x.com+las+vegas+emergency+restoration'
];

export async function fetchXLeads(endpoints = X_RSS_ENDPOINTS): Promise<XLead[]> {
  const leads: XLead[] = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 [X / TWITTER SCRAPER] Fetching Google News RSS query target: ${endpoint}`);
      const res = await fetch(endpoint, {
        headers: X_SCRAPER_HEADERS
      });

      if (!res.ok) {
        console.warn(`⚠️ [X / TWITTER SCRAPER] HTTP ${res.status} when fetching ${endpoint}. Gracefully skipping.`);
        continue;
      }

      let xml = await res.text();

      // Clean error handling for invalid non-XML responses
      if (!xml || !xml.trim().startsWith('<') || (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<channel'))) {
        console.warn(`⚠️ [X / TWITTER SCRAPER] Non-XML payload returned for ${endpoint}. Gracefully skipping.`);
        continue;
      }

      // Sanitize unescaped ampersands
      xml = xml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

      try {
        const feed = await parser.parseString(xml);
        for (const item of feed.items || []) {
          const id = item.guid || item.link || item.id || `x-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const link = item.link || id;
          const title = item.title || item.contentSnippet || 'X / Twitter Post';
          const date = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
          const text = item.contentSnippet || item.content || item.title || '';

          leads.push({
            id,
            title,
            link,
            source: 'X / Twitter',
            date,
            text
          });
        }
      } catch (parseErr: any) {
        console.warn(`⚠️ [X / TWITTER SCRAPER] XML parse error for ${endpoint}: ${parseErr.message}. Skipping feed.`);
      }
    } catch (err: any) {
      console.error(`❌ [X / TWITTER SCRAPER ERROR] Exception fetching X/Twitter RSS query (${endpoint}):`, err.message);
    }
  }

  console.log(`📥 [X / TWITTER SCRAPER] Fetched ${leads.length} normalized leads from X / Twitter RSS targets.`);
  return leads;
}
