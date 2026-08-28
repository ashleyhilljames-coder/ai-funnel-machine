import Parser from 'rss-parser';

export const CRAIGSLIST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'cross-site',
  'Upgrade-Insecure-Requests': '1'
};

const parser = new Parser({
  headers: CRAIGSLIST_HEADERS
});

export const CRAIGSLIST_RSS_ENDPOINTS = [
  'https://lasvegas.craigslist.org/search/sks?format=rss&query=emergency+repair|water+damage|pipe+burst|flood|leak|plumber|restoration',
  'https://lasvegas.craigslist.org/search/bbb?format=rss&query=emergency+repair|water+damage|pipe+burst|flood|leak|plumber|restoration',
  'https://lasvegas.craigslist.org/search/ccc?format=rss&query=emergency+repair|water+damage|pipe+burst|flood|leak|plumber|restoration'
];

/**
 * Fallback HTML parser for Craigslist search listings if RSS endpoint returns 403 or non-XML response
 */
export function parseCraigslistHtml(html) {
  const leads = [];
  try {
    const resultRegex = /<li[^>]*class="[^"]*cl-static-search-result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = resultRegex.exec(html)) !== null) {
      const link = match[1]?.trim();
      const rawTitle = match[2]?.replace(/<[^>]+>/g, '').trim();

      if (link && rawTitle) {
        const fullLink = link.startsWith('http') ? link : `https://lasvegas.craigslist.org${link}`;
        const id = fullLink;

        leads.push({
          id,
          title: rawTitle,
          link: fullLink,
          source: 'Craigslist',
          date: new Date().toISOString(),
          text: rawTitle
        });
      }
    }

    if (leads.length === 0) {
      const anchorRegex = /<a[^>]+href="(https:\/\/lasvegas\.craigslist\.org\/[a-z0-9\/]+\/\d+\.html)"[^>]*>([^<]+)<\/a>/gi;
      while ((match = anchorRegex.exec(html)) !== null) {
        const link = match[1];
        const title = match[2].trim();
        if (link && title && title.length > 5) {
          leads.push({
            id: link,
            title,
            link,
            source: 'Craigslist',
            date: new Date().toISOString(),
            text: title
          });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [CRAIGSLIST HTML PARSER WARN] Failed to parse HTML fallback content:', err.message);
  }

  return leads;
}

export async function fetchCraigslistLeads(endpoints = CRAIGSLIST_RSS_ENDPOINTS) {
  const leads = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 [CRAIGSLIST SCRAPER] Fetching RSS feed: ${endpoint}`);
      const res = await fetch(endpoint, {
        headers: CRAIGSLIST_HEADERS
      });

      if (!res.ok) {
        console.warn(`⚠️ [CRAIGSLIST SCRAPER] HTTP ${res.status} when fetching ${endpoint}. Trying HTML direct search fallback...`);
        const fallbackUrl = endpoint.replace('?format=rss&', '?');
        const fallbackRes = await fetch(fallbackUrl, { headers: CRAIGSLIST_HEADERS });
        if (fallbackRes.ok) {
          const html = await fallbackRes.text();
          const parsedHtmlLeads = parseCraigslistHtml(html);
          leads.push(...parsedHtmlLeads);
        } else {
          console.warn(`⚠️ [CRAIGSLIST SCRAPER] HTML fallback also returned HTTP ${fallbackRes.status}. Gracefully skipping.`);
        }
        continue;
      }

      let xml = await res.text();

      // Check if response is non-XML (e.g. HTML search page or Cloudflare response)
      if (!xml || !xml.trim().startsWith('<') || (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<rdf:RDF'))) {
        console.warn(`⚠️ [CRAIGSLIST SCRAPER] Non-XML response returned for RSS endpoint. Parsing as direct HTML search fallback...`);
        const parsedHtmlLeads = parseCraigslistHtml(xml);
        leads.push(...parsedHtmlLeads);
        continue;
      }

      // Sanitize unescaped ampersands
      xml = xml.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

      try {
        const feed = await parser.parseString(xml);
        for (const item of feed.items || []) {
          const id = item.guid || item.link || item.id || `cl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const link = item.link || id;
          const title = item.title || 'Untitled Craigslist Emergency Listing';
          const date = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
          const text = item.contentSnippet || item.content || item.title || '';

          leads.push({
            id,
            title,
            link,
            source: 'Craigslist',
            date,
            text
          });
        }
      } catch (parseErr) {
        console.warn(`⚠️ [CRAIGSLIST SCRAPER] RSS XML parse failed (${parseErr.message}). Fallback to HTML string parser...`);
        const parsedHtmlLeads = parseCraigslistHtml(xml);
        leads.push(...parsedHtmlLeads);
      }
    } catch (err) {
      console.error(`❌ [CRAIGSLIST SCRAPER ERROR] Failed to fetch Craigslist RSS feed (${endpoint}):`, err.message);
    }
  }

  console.log(`📥 [CRAIGSLIST SCRAPER] Fetched ${leads.length} normalized leads from Craigslist endpoints.`);
  return leads;
}
