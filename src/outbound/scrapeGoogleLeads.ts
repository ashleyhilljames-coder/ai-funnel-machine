import 'dotenv/config';
import { LeadGuard } from './leadGuard.js';
import { appendLeadToSheet } from '../services/sheetsService.js';

// Define the interface for Google Maps API response
interface GooglePlace {
  id?: string;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  website?: string;
  displayName?: {
    text: string;
    languageCode: string;
  };
}

/**
 * Parses and extracts domain name from website URL.
 */
function extractDomain(url: string): string | null {
  try {
    const cleanUrl = url.trim().toLowerCase();
    const withProtocol = cleanUrl.startsWith('http') ? cleanUrl : `http://${cleanUrl}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname;
    // Remove 'www.' prefix if it exists
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch (err) {
    return null;
  }
}

/**
 * Dynamically generates a contact email address for a business based on its website or name.
 */
function generateBusinessEmail(name: string, website?: string): string {
  if (website) {
    const domain = extractDomain(website);
    if (domain && domain.includes('.')) {
      return `info@${domain}`;
    }
  }

  // Fallback: slugify name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-'); // replace spaces with hyphens
  
  return `contact@${slug || 'localbusiness'}.com`;
}

/**
 * Dynamically determines the damage type based on the search query terms.
 */
function determineDamageType(query: string): string {
  const cleanQuery = query.toLowerCase();
  if (cleanQuery.includes('plumb') || cleanQuery.includes('water') || cleanQuery.includes('leak') || cleanQuery.includes('flood')) {
    return 'Water Damage';
  }
  if (cleanQuery.includes('fire') || cleanQuery.includes('smoke') || cleanQuery.includes('soot') || cleanQuery.includes('burn')) {
    return 'Fire Damage';
  }
  if (cleanQuery.includes('mold') || cleanQuery.includes('remed') || cleanQuery.includes('mildew') || cleanQuery.includes('fungus')) {
    return 'Mold Infestation';
  }
  if (cleanQuery.includes('roof') || cleanQuery.includes('roofer') || cleanQuery.includes('storm') || cleanQuery.includes('wind')) {
    return 'Storm / Roof Leak';
  }
  return 'General Restoration';
}

/**
 * Returns mock leads list when running in simulation mode.
 */
function getMockPlaces(query: string): GooglePlace[] {
  const category = determineDamageType(query);
  
  if (category === 'Storm / Roof Leak') {
    return [
      {
        formattedAddress: '432 Desert Sun Way, Las Vegas, NV 89101',
        nationalPhoneNumber: '702-555-0188',
        website: 'https://vegasvalleyroofing.com',
        displayName: { text: 'Vegas Valley Roofing Experts', languageCode: 'en' }
      },
      {
        formattedAddress: '988 Strip Vista Ave, Las Vegas, NV 89109',
        nationalPhoneNumber: '702-555-0144',
        website: 'https://sincityroofers.org',
        displayName: { text: 'Sin City Roof Crew', languageCode: 'en' }
      },
      {
        formattedAddress: '12 Apex Heights Blvd, Las Vegas, NV 89131',
        nationalPhoneNumber: '702-555-0199',
        website: '',
        displayName: { text: 'Apex Desert Roofing', languageCode: 'en' }
      }
    ];
  } else if (category === 'Water Damage') {
    return [
      {
        formattedAddress: '555 Blue River Rd, Las Vegas, NV 89117',
        nationalPhoneNumber: '702-555-0211',
        website: 'https://lasvegasplumbingpro.com',
        displayName: { text: 'Vegas Water Flow & Plumbing', languageCode: 'en' }
      },
      {
        formattedAddress: '782 Dry Land Dr, Las Vegas, NV 89145',
        nationalPhoneNumber: '702-555-0233',
        website: '',
        displayName: { text: 'Sin City Emergency DryOut', languageCode: 'en' }
      }
    ];
  } else {
    // Default mock list
    return [
      {
        formattedAddress: '777 Apex Way, Las Vegas, NV 89131',
        nationalPhoneNumber: '702-555-0777',
        website: 'https://syncrorestoration.com',
        displayName: { text: 'Syncro Emergency Restoration Services', languageCode: 'en' }
      }
    ];
  }
}

export async function runScraper(queryOverride?: string) {
  const guard = new LeadGuard();
  const clientId = 'default_client';

  // 1. Parse CLI query argument or use override
  let searchKeywords = queryOverride;
  if (!searchKeywords) {
    const queryArg = process.argv.find(arg => arg.startsWith('--query='));
    searchKeywords = queryArg ? queryArg.split('=')[1] : 'roofers in Las Vegas';
  }

  console.log(`\n🌀 [Google Places Scraper] Active Search Query: "${searchKeywords}"`);
  const damageType = determineDamageType(searchKeywords);
  console.log(`💥 Detected Damage Mapping: "${damageType}"`);

  let placesList: GooglePlace[] = [];
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // 2. Query Google Places API or run in Simulation fallback mode
  if (!apiKey) {
    console.log("⚠️  [Places Scraper] GOOGLE_MAPS_API_KEY is missing in .env.");
    console.log("👉 Loading [Simulation Mode] with target sector mock data...\n");
    placesList = getMockPlaces(searchKeywords);
  } else {
    console.log("⚡ [Places Scraper] Active API Key detected. Fetching live Google Maps API records...\n");
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.website'
        },
        body: JSON.stringify({ textQuery: searchKeywords })
      });

      if (!response.ok) {
        throw new Error(`Google Places API returned status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { places?: GooglePlace[] };
      placesList = data.places || [];
    } catch (apiError: any) {
      console.error("❌ Google Places API fetch failed. Falling back to Simulation Mode...", apiError.message);
      placesList = getMockPlaces(searchKeywords);
    }
  }

  console.log(`📊 Found ${placesList.length} search result(s) to process.`);
  console.log("-------------------------------------------------------------------------");

  let totalScraped = 0;
  let totalImported = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  // 3. Process and Ingest leads
  for (let i = 0; i < placesList.length; i++) {
    const place = placesList[i];
    totalScraped++;

    const businessName = place.displayName?.text || 'Local Business';
    const phone = place.nationalPhoneNumber || '';
    const address = place.formattedAddress || 'No Address Provided';
    const email = generateBusinessEmail(businessName, place.website);

    // Lead Guard: Check for duplicate email registry inside SQLite
    if (guard.isDuplicateForClient(email, clientId)) {
      totalDuplicates++;
      console.log(`⚠️  [DUPLICATE] Skipped: ${businessName} (${email}) already registered.`);
      continue;
    }

    try {
      console.log(`🌀 Ingesting Google lead [${i + 1}/${placesList.length}]: ${businessName}`);
      
      await appendLeadToSheet(clientId, {
        name: businessName,
        phone: phone,
        email: email,
        address: address,
        damageType: damageType
      }, 'Scraped Leads');

      // Save registry inside SQLite DB
      guard.registerClientLead(email, clientId, false, businessName, damageType);
      totalImported++;
    } catch (ingestionError: any) {
      totalFailed++;
      console.error(`❌ Ingestion failed for ${businessName}:`, ingestionError.message);
    }
  }

  const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 📊 Scraper Dashboard Report Output
  console.log("\n=========================================================================");
  console.log(` ⚡ SYNCRO SCALE — GOOGLE PLACES LEAD GENERATION REPORT ⚡ `);
  console.log("=========================================================================");
  console.log(` 🏢 Client Profile:   ${clientId.toUpperCase()}`);
  console.log(` 🔍 Search Keywords:  "${searchKeywords}"`);
  console.log(` ⏱️  Execution Time:   ${executionTime} seconds`);
  console.log("-------------------------------------------------------------------------");
  console.log(` 📈 Total Scraped:    ${totalScraped} leads`);
  console.log(` ✅ Sheet Appends:    ${totalImported} leads successfully added`);
  console.log(` ⚠️  Duplicates Blocked: ${totalDuplicates} leads isolated`);
  console.log(` ❌ Scraping Failures: ${totalFailed} leads failed`);
  console.log("=========================================================================\n");
  return {
    success: true,
    totalScraped,
    totalImported,
    totalDuplicates,
    totalFailed,
    executionTime
  };
}

if (process.argv[1] && (process.argv[1].endsWith('scrapeGoogleLeads.ts') || process.argv[1].endsWith('scrapeGoogleLeads.js') || process.argv[1].includes('scrape-leads'))) {
  runScraper().catch(console.error);
}
