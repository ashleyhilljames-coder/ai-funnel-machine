// Structured course content data for Syncro Scale Academy
const COURSE_SYLLABUS = [
  {
    id: "module1",
    title: "Module 1: Core Operations & Systems",
    lessons: [
      { id: "1.1", title: "1.1 Architecture of the AI Funnel Machine" },
      { id: "1.2", title: "1.2 Ingestion & Lead Validation (Express + Zod)" },
      { id: "1.3", title: "1.3 The Agentic Qualification Pipeline" },
      { id: "1.4", title: "1.4 Multi-Tenant Google Calendar Booking" },
      { id: "1.5", title: "1.5 Outbound Lead Scraper & Multi-Tenant Routing" },
      { id: "1.6", title: "1.6 Tenant Guards & Deduplication System" },
      { id: "1.7", title: "1.7 Conversational Voice Agents & Niche Prompts" },
      { id: "1.8", title: "1.8 System Maintenance, SOPs, & Troubleshooting" }
    ]
  },
  {
    id: "module2",
    title: "Module 2: The Master Salesperson Blueprint",
    lessons: [
      { id: "2.1", title: "2.1 The AI Agency Value Proposition" },
      { id: "2.2", title: "2.2 Lead Sourcing, Scraping, & List Cleaning" },
      { id: "2.3", title: "2.3 Hyper-Personalized Outbound Campaigns" },
      { id: "2.4", title: "2.4 The B2B Discovery Call Framework" },
      { id: "2.5", title: "2.5 The Live Demo Close (The 'Wow' Experience)" },
      { id: "2.6", title: "2.6 Enterprise Objection Handling" },
      { id: "2.7", title: "2.7 Proposals, Pricing Models, & Closings" }
    ]
  },
  {
    id: "module3",
    title: "Module 3: Elite Client Fulfillment & Service Delivery",
    lessons: [
      { id: "3.1", title: "3.1 The Flawless Onboarding Protocol" },
      { id: "3.2", title: "3.2 Custom Tenant Provisioning & Prompt Engineering" },
      { id: "3.3", title: "3.3 Launch Sequence & First 72 Hours Audit" },
      { id: "3.4", title: "3.4 Reporting ROI, Analytics, & MBR Reviews" },
      { id: "3.5", title: "3.5 Managing Scope Creep & Retainer Maintenance" },
      { id: "3.6", title: "3.6 Crisis Operations & Emergency SOPs" }
    ]
  }
];

const LESSONS_CONTENT = {
  "1.1": {
    title: "1.1 Architecture of the AI Funnel Machine",
    lecture: `<p>The AI Funnel Machine operates on an asynchronous event-driven model. This design prevents API timeouts when calling slow external LLMs (Claude) or external APIs (Google Calendar).</p>
    <h4>Inbound Flow:</h4>
    <pre>POST /api/leads ──> Zod Validate ──> Pub/Sub Queue ──> Background worker (subscriber) ──> AI Qualifier (Claude) ──> AI Evaluator (Claude) ──> CalendarBooker (GCal)</pre>
    <h4>Outbound Flow:</h4>
    <pre>CSV intake ──> LeadScraper ──> LeadGuard (SQLite Dupe Check) ──> OutboundProcessor (OpenAI) ──> Resend API Dispatch</pre>`,
    exercise: "Execute <code>npm run test:lead</code> in the terminal to verify the local integration test suite runs and books a mock calendar slot.",
    quiz: {
      question: "What is the primary purpose of using GCP Pub/Sub in the inbound pipeline?",
      options: [
        "To compile TypeScript files to JavaScript.",
        "To decouple API ingestion from slow LLM processing, preventing client timeouts.",
        "To encrypt the SQLite database records.",
        "To host the WebSocket voice streams."
      ],
      answer: 1,
      explanation: "Pub/Sub acts as an ingestion buffer. The API responds instantly (202 Accepted) and delegates the slow AI evaluation steps to background worker daemons."
    }
  },
  "1.2": {
    title: "1.2 Ingestion & Lead Validation (Express + Zod)",
    lecture: `<p>Backend API validation is the final wall of defense. Zod schemas validate and clean payloads before any data hits database files or message brokers.</p>
    <pre>export const LeadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  createdAt: z.string().datetime()
});</pre>`,
    exercise: "Boot the local dev server using <code>npm run dev</code> and send a malformed curl post request to <code>/api/leads</code> to verify the server returns a 400 Bad Request error.",
    quiz: {
      question: "Which HTTP status code is most appropriate for a successfully queued ingestion lead?",
      options: [
        "200 OK",
        "201 Created",
        "202 Accepted",
        "500 Internal Server Error"
      ],
      answer: 2,
      explanation: "HTTP 202 (Accepted) indicates the request has been received and queued, but processing (AI qualification and booking) is not yet complete."
    }
  },
  "1.3": {
    title: "1.3 The Agentic Qualification Pipeline",
    lecture: `<p>Instead of one massive prompt, the pipeline uses a double-gated model. First, the QualifierAgent scores completeness (0-100). Next, the EvaluatorAgent checks niche-specific brand fit.</p>
    <ul>
      <li><strong>Gate 1 Exit:</strong> Score < 60 terminates processing immediately (Outcome: 'disqualified').</li>
      <li><strong>Gate 2 Exit:</strong> Confidence < 0.65 terminates processing immediately (Outcome: 'poor-brand-fit').</li>
    </ul>`,
    exercise: "Modify <code>SYSTEM_PROMPT</code> in <code>src/agents/qualifier.ts</code> to require a phone number. Verify that a lead missing a phone number gets disqualified early with score 45.",
    quiz: {
      question: "What is the primary benefit of the double-gated qualification model?",
      options: [
        "It prevents all database write operations.",
        "It minimizes API token expenses by terminating early on junk leads before calling the second agent.",
        "It forces the model to return raw markdown text.",
        "It removes the need for GCP Pub/Sub topics."
      ],
      answer: 1,
      explanation: "Gating lead scores saves substantial API costs. If a lead fails Gate 1, we exit immediately, avoiding the expense of calling subsequent agents."
    }
  },
  "1.4": {
    title: "1.4 Multi-Tenant Google Calendar Booking",
    lecture: `<p>Connecting to user calendars requires a GCP Service Account. The target calendar owner must share their calendar settings with the service account client email (<code>calendar-bot@...</code>) and grant 'Make changes to events' permissions.</p>`,
    exercise: "Modify <code>DISCOVERY_CALL_DURATION_MINUTES</code> in <code>src/agents/calendar-booker.ts</code> to 45 and run the test runner to see the updated invite on Google Calendar.",
    quiz: {
      question: "What permission level must you select when sharing a calendar with your service account email?",
      options: [
        "See only free/busy",
        "See all event details",
        "Make changes to events",
        "Delete calendar"
      ],
      answer: 2,
      explanation: "To programmatically insert and modify bookings, the service account bot email must be granted write permissions ('Make changes to events')."
    }
  },
  "1.5": {
    title: "1.5 Outbound Lead Scraper & Multi-Tenant Routing",
    lecture: `<p>Outbound campaigns pull data from local CSV lead sheets in ` + "`intake/`" + `. The intake router parses columns dynamically (allowing variations like Business vs. Company) and moves completed files to ` + "`archive/`" + `.</p>`,
    exercise: "Run <code>npx tsx run-outbound.ts --client=default_client</code> on a mock CSV lead sheet and verify the sheet is moved to the archive folder.",
    quiz: {
      question: "How does the intake router handle processed campaign lead sheets?",
      options: [
        "It uploads them to public S3 buckets.",
        "It renames them with a timestamp and moves them to the archive directory.",
        "It drops all data and deletes the files.",
        "It sends them to Twilio."
      ],
      answer: 1,
      explanation: "To keep the intake queue clean and prevent duplicate outreach campaigns, files are renamed with a unique timestamp and archived."
    }
  },
  "1.6": {
    title: "1.6 Tenant Guards & Deduplication System",
    lecture: `<p>Protecting email sending domains from spam flags requires deduplication. ` + "`LeadGuard`" + ` uses SQLite composite unique indexes on ` + "`(email, client_id)`" + ` to intercept duplicate leads before outbound sequences fire.</p>`,
    exercise: "Insert the same email address twice in an intake CSV file, run the campaign runner, and confirm the second row is skipped with a duplicate warning.",
    quiz: {
      question: "Which SQL constraint enforces database-level uniqueness across client campaigns?",
      options: [
        "PRIMARY KEY (id)",
        "UNIQUE(email, client_id)",
        "CREATE TABLE lead_registry",
        "FOREIGN KEY (client_id)"
      ],
      answer: 1,
      explanation: "Enforcing UNIQUE(email, client_id) prevents any client profile from contacting the same prospect multiple times."
    }
  },
  "1.7": {
    title: "1.7 Conversational Voice Agents & Niche Prompts",
    lecture: `<p>Voice bots stream audio using OpenAI's Realtime WebSocket protocol (PCM16 formats) under 1 second. System instructions and voice parameters are loaded dynamically from SQLite overrides or default niche templates.</p>`,
    exercise: "Run <code>npx tsx verify_voice_settings.ts</code> to test database persistence and default voice tone resolver overrides.",
    quiz: {
      question: "What is the default system fallback voice tone if no override exists in SQLite?",
      options: [
        "onyx",
        "shimmer",
        "alloy",
        "nova"
      ],
      answer: 2,
      explanation: "If no override is defined for the tenant, getVoiceAgentVoice falls back to 'alloy' to ensure the session starts."
    }
  },
  "1.8": {
    title: "1.8 System Maintenance, SOPs, & Troubleshooting",
    lecture: `<p>Operating a production server requires containerization and rate limit handling. Multi-stage Docker builds separate compilation packages from final runtime containers to minimize sizes and protect endpoints.</p>`,
    exercise: "Audit the local project Dockerfile to verify how the builder stage compiles source code separate from the production stage.",
    quiz: {
      question: "What should background worker processes do if they hit external API rate limits?",
      options: [
        "Delete the queue backlog immediately.",
        "Negative acknowledge (nack) messages so GCP Pub/Sub holds them for retry after backoff.",
        "Disable the SQLite database.",
        "Change the service account key."
      ],
      answer: 1,
      explanation: "Nacking tells the message queue to keep the lead safe, allowing the system to retry processing automatically when rate limits clear."
    }
  },
  "2.1": {
    title: "2.1 The AI Agency Value Proposition",
    lecture: `<p>Contractors lose thousands of dollars weekly from 'Voicemail Leakage' (75% of emergency callers hang up on voicemails). Pitch them call capture retainers and database reactivation instead of complex code terminology.</p>`,
    exercise: "Calculate the monthly profit return for a contractor paying a $2,000 retainer if the system captures 3 water damage jobs (average ticket $5,000, 45% profit margin).",
    quiz: {
      question: "What is the primary selling metric to pitch to home service contractors?",
      options: [
        "OpenAI API token counts.",
        "Relational database schemas.",
        "Prevented missed calls and secured jobs revenue.",
        "TypeScript compiler configurations."
      ],
      answer: 2,
      explanation: "Contractors buy business results. Focus on how capturing missed calls secures high-ticket jobs and prevents revenue leakage."
    }
  },
  "2.2": {
    title: "2.2 Lead Sourcing, Scraping, & List Cleaning",
    lecture: `<p>Source contractor leads from pages 2-4 of Google Maps (who run ads but miss calls). Clean raw lists by deduplicating emails and filtering out generic addresses like info@ to ensure outreach reaches key decision makers.</p>`,
    exercise: "Scrape 5 local water mitigation companies, extract specific contact names, format them into a clean CSV file, and drop it in the intake directory.",
    quiz: {
      question: "Why should you filter out generic email addresses (like info@ or admin@) in outbound campaigns?",
      options: [
        "They are rejected by the Zod compiler.",
        "They route to group inboxes, resulting in extremely low reply rates compared to name-specific emails.",
        "They increase Resend API pricing rates.",
        "They cause calendar invite clashes."
      ],
      answer: 1,
      explanation: "Targeting individuals (e.g. dave@company.com) increases response rates compared to sending pitches to general group mailboxes."
    }
  },
  "2.3": {
    title: "2.3 Hyper-Personalized Outbound Campaigns",
    lecture: `<p>Cold email copywriting must follow the Four-Sentence Rule: Context, Problem, Solution, and Soft CTA. Plain-text campaigns generated via OpenAI and sent via Resend look personal and bypass inbox spam filters.</p>`,
    exercise: "Draft a personalized template focusing on call overflow capture and test it using a test run through Resend.",
    quiz: {
      question: "What is the advantage of using a 'soft CTA' in a cold email?",
      options: [
        "It forces the client to pay an onboarding fee.",
        "It has low friction, starting a conversation with a simple question instead of asking for a big meeting commitment.",
        "It increases email delivery speed.",
        "It validates the domain's SPF record."
      ],
      answer: 1,
      explanation: "Asking a low-friction question (e.g., 'Do you use an answering service?') gets more replies than forcing them to book a Zoom meeting right away."
    }
  },
  "2.4": {
    title: "2.4 The B2B Discovery Call Framework",
    lecture: `<p>Discovery is diagnostic consulting, not software sales. Establish an agenda, ask open-ended questions about call handling, amplify the cost of missed leads, and pivot to scheduling a Zoom live demo.</p>`,
    exercise: "Conduct a practice discovery roleplay answering objections about answering service fees and missed leads.",
    quiz: {
      question: "What is the primary target objective of a discovery sales call?",
      options: [
        "Securing a signed Master Services Agreement (MSA).",
        "Charging the prospect's card for setup fees.",
        "Scheduling the next meeting to run a live demonstration of the system.",
        "Asking for developer credentials."
      ],
      answer: 2,
      explanation: "Discovery builds trust. Moving from a diagnostic call to a live demo is a low-friction step that prospects readily accept."
    }
  },
  "2.5": {
    title: "2.5 The Live Demo Close (The 'Wow' Experience)",
    lecture: `<p>Nothing closes clients like live proof. Provision a custom database settings profile in SQLite for the prospect, fill out a web lead live on screen, and let them watch the invite appear on their calendar in 30 seconds.</p>`,
    exercise: "Write an SQL insert statement to configure a mock prospect company and tone in client_settings, and verify its resolution.",
    quiz: {
      question: "Why is a personalized live demo more effective than a general video walk-through?",
      options: [
        "It saves money on API tokens.",
        "It allows the prospect to experience their own business greeting and calendar integration in real-time, removing doubts.",
        "It bypasses SQLite database locks.",
        "It resolves Twilio configuration errors."
      ],
      answer: 1,
      explanation: "Seeing their actual business details running in the system live creates a powerful feeling of ownership and closes sales."
    }
  },
  "2.6": {
    title: "2.6 Enterprise Objection Handling",
    lecture: `<p>Objections are buying signals. Use the A.C.R. model (Acknowledge, Clarify, Resolve). Explain data privacy (local SQLite files), accuracy (validation gates), and why our retainer is cheaper than hiring in-house developers.</p>`,
    exercise: "Formulate a response handling the concern: 'What if the AI hallucinating books the wrong time?' using the A.C.R. model.",
    quiz: {
      question: "How does the system ensure data privacy for client lead logs?",
      options: [
        "By archiving leads on public web servers.",
        "By containing records locally in a secure SQLite database (agentic_nexus.db) and encrypting connections.",
        "By uploading logs to OpenAI training datasets.",
        "By routing emails through Twilio bypass networks."
      ],
      answer: 1,
      explanation: "Local database containment prevents customer data leaks and ensures logs are never used to train public models."
    }
  },
  "2.7": {
    title: "2.7 Proposals, Pricing Models, & Closings",
    lecture: `<p>Structure prices using a setup fee ($2,500+) and a monthly maintenance retainer ($1,500+). Deliver a 1-page proposal and secure a Master Services Agreement (MSA) containing API limits and third-party disclaimers.</p>`,
    exercise: "Draft a 1-page proposal for an HVAC client outlining the setup fee, monthly retainer, and core system deliverables.",
    quiz: {
      question: "Why should your client agreements contain a 'Third-Party API Disclaimer'?",
      options: [
        "To hide code details from the client.",
        "To protect your agency from liability if external services like Google Cloud or OpenAI experience outages.",
        "To force the client to purchase custom domains.",
        "To bypass Twilio billing gates."
      ],
      answer: 1,
      explanation: "Disclaimers protect your agency from outages on platforms you do not own or control."
    }
  },
  "3.1": {
    title: "3.1 The Flawless Onboarding Protocol",
    lecture: `<p>Deploy client systems quickly to maintain trust. Collect brand preferences via intake forms, and provide a 3-step guide for the client to invite your service account email to their Google Calendar with write permissions.</p>`,
    exercise: "Write a welcome email instructing a new client to complete their intake form and share their Google Calendar.",
    quiz: {
      question: "What is the secure email address to share the calendar with?",
      options: [
        "Your personal Gmail account.",
        "The service account client email address found inside gcp-key.json.",
        "The Resend SMTP server address.",
        "The SQLite database admin login."
      ],
      answer: 1,
      explanation: "Sharing the target calendar with the service account client email (client_email) authorizes your backend code to make booking calls."
    }
  },
  "3.2": {
    title: "3.2 Custom Tenant Provisioning & Prompt Engineering",
    lecture: `<p>To launch a client, insert their settings into SQLite. Customize the qualifier prompt rules based on their geographic boundaries or service criteria to ensure only valid leads are booked.</p>`,
    exercise: "Write an SQL query to insert a tenant profile into client_settings, configuring custom voiceTone shimmer and greetings.",
    quiz: {
      question: "What is the benefit of a database-driven tenant config over hardcoding settings in TypeScript?",
      options: [
        "It reduces the size of the SQLite binary file.",
        "It allows you to add and edit clients dynamically via database records without needing to redeploy server code.",
        "It removes the need for OpenAI API keys.",
        "It connects directly to Resend servers."
      ],
      answer: 1,
      explanation: "Storing settings in database tables decouples application code from client data, letting you scale operations seamlessly."
    }
  },
  "3.3": {
    title: "3.3 Launch Sequence & First 72 Hours Audit",
    lecture: `<p>Launch day requires verifying calendar permissions and SMTP domains. During the first 72 hours, manually audit the first 10 leads to catch any qualification errors and tune prompt parameters accordingly.</p>`,
    exercise: "Review a mock audit lead log, identify a false positive mismatch, and draft a prompt adjustment to fix it.",
    quiz: {
      question: "What is a 'False Positive' (Type I error) in lead qualification?",
      options: [
        "When the database locks during a search query.",
        "When the system qualifies a low-value or junk lead that doesn't fit the client's business SOW.",
        "When a valid lead is disqualified.",
        "When GCP Pub/Sub experiences a timeout."
      ],
      answer: 1,
      explanation: "False positives occur when the AI qualifies low-value or out-of-scope leads, filling the client's schedule with junk calls."
    }
  },
  "3.4": {
    title: "3.4 Reporting ROI, Analytics, & MBR Reviews",
    lecture: `<p>Clients cancel when they forget the value of your system. Run Monthly Business Reviews (MBRs) using SQL queries to group lead outcomes, verify campaign runs, and prove financial ROI and administrative hours saved.</p>`,
    exercise: "Write an SQL query to group and count leads by status, and write an ROI summary for an HVAC client.",
    quiz: {
      question: "What SQL command groups and counts records in SQLite?",
      options: [
        "SELECT COUNT(*) GROUP BY status",
        "SELECT status, COUNT(*) FROM lead_registry GROUP BY status",
        "SELECT ALL status FROM lead_registry",
        "ORDER BY status COUNT(*)"
      ],
      answer: 1,
      explanation: "Combining SELECT with COUNT(*) and GROUP BY groups rows that share values, summarizing outcome counts cleanly."
    }
  },
  "3.5": {
    title: "3.5 Managing Scope Creep & Retainer Maintenance",
    lecture: `<p>Scope creep eats margins. Delineate between Maintenance (included in retainers, e.g. bug fixes, calendar adjustments) and Feature Additions (billed separately, e.g. CRM sync, SMS routes). Pitch feature additions as upsells.</p>`,
    exercise: "Draft an email response to a client requesting a free CRM sync, explaining project boundaries and offering it as an upsell.",
    quiz: {
      question: "Which of the following is considered system maintenance covered by a retainer?",
      options: [
        "Integrating a new CRM platform.",
        "Auditing logs and fixing a bug causing calendar event failures.",
        "Building a custom admin dashboard.",
        "Adding SMS intake channels."
      ],
      answer: 1,
      explanation: "Maintenance covers keeping the existing, signed scope running smoothly. New features require new SOWs and fees."
    }
  },
  "3.6": {
    title: "3.6 Crisis Operations & Emergency SOPs",
    lecture: `<p>Outages occur. Trace log errors using diagnostic tables (e.g. 404 Calendar not found). Reassure clients immediately that leads are held safely in the Pub/Sub queue buffer, and restart services once connections are updated.</p>`,
    exercise: "Analyze a mock GCal 404 error log, outline the resolution steps, and draft a client notification email.",
    quiz: {
      question: "What does calling message.nack() in the subscriber do during an outage?",
      options: [
        "It deletes the lead record to prevent duplicates.",
        "It holds the message in the Pub/Sub queue, retrying delivery automatically when connections are restored.",
        "It shuts down the Express server.",
        "It sends an alert to the client's phone."
      ],
      answer: 1,
      explanation: "Negative acknowledgements (nack) tell the queue that processing failed. The message is retained in the queue, ensuring no data loss."
    }
  }
};
