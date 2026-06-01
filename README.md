# AI Funnel Machine

A TypeScript Node.js service that ingests leads via HTTP, validates and publishes them to Google Cloud Pub/Sub, and processes them through an AI-powered qualification pipeline that scores, evaluates brand fit, and books discovery calls on Google Calendar.

## Architecture

```
POST /leads
     │
     ▼
ingestLead()        validate (Zod) → publish to Pub/Sub
     │
     ▼
subscriber          consume messages from Pub/Sub
     │
     ▼
processLead()
     ├── QualifierAgent    score 0–100 via Claude — exits if score < 60
     ├── EvaluatorAgent    brand fit + confidence via Claude — exits if confidence < 0.65
     └── CalendarBooker    create a 30-min discovery call on Google Calendar
```

## Prerequisites

- Node.js 22+
- A [Google Cloud](https://console.cloud.google.com) project with:
  - **Pub/Sub API** enabled
  - **Google Calendar API** enabled
  - A service account with a JSON key downloaded
- An [Anthropic API key](https://console.anthropic.com) with available credits

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
PUBSUB_TOPIC=leads
PUBSUB_SUBSCRIPTION=leads-sub
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CALENDAR_ID=you@example.com
GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json
SKIP_CALENDAR_BOOKING=false
```

| Variable | Description |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `PUBSUB_TOPIC` | Pub/Sub topic name for lead ingestion |
| `PUBSUB_SUBSCRIPTION` | Pub/Sub subscription name for lead processing |
| `ANTHROPIC_API_KEY` | Anthropic API key for the qualifier and evaluator agents |
| `GOOGLE_CALENDAR_ID` | Calendar to book discovery calls on (e.g. `you@gmail.com` or `primary`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to your GCP service account JSON key (local dev only; not needed when running on GCP) |
| `SKIP_CALENDAR_BOOKING` | Set to `true` to skip the Calendar step (useful for testing AI agents without GCP auth) |
| `NODE_ENV` | `development` \| `production` \| `test` (default: `development`) |
| `PORT` | HTTP server port (default: `3000`) |

### 3. Add the GCP service account key

Download a JSON key for your service account from **Google Cloud Console → IAM & Admin → Service Accounts → Keys → Add Key → JSON** and save it as `gcp-key.json` in the project root. It is gitignored and will never be committed.

### 4. Enable the Google Calendar API

In the [Google Cloud Console](https://console.cloud.google.com), navigate to **APIs & Services → Library**, search for **Google Calendar API**, and enable it.

### 5. Share your calendar with the service account

For the service account to create events on your calendar:

1. Open **Google Calendar → Settings → [your calendar] → Share with specific people**
2. Add the service account's `client_email` (e.g. `calendar-bot@your-project.iam.gserviceaccount.com`)
3. Grant **"Make changes to events"** permission

### 6. Create the Pub/Sub topic and subscription

```bash
gcloud pubsub topics create leads
gcloud pubsub subscriptions create leads-sub --topic=leads
```

---

## Running

### Test the pipeline locally (no Pub/Sub required)

Runs a sample lead directly through the full qualify → evaluate → book pipeline:

```bash
npm run test:lead
```

To test just the AI agents without hitting Google Calendar, set `SKIP_CALENDAR_BOOKING=true` in `.env` first.

### Development server

Starts the HTTP server and Pub/Sub subscriber together:

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t ai-funnel-machine .
docker run --env-file .env -p 3000:3000 ai-funnel-machine
```

---

## API

### `POST /leads`

Ingests a lead. Validates the payload, assigns a UUID and timestamp, and publishes to Pub/Sub. The subscriber picks it up and runs it through the processing pipeline asynchronously.

**Request body**

```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1-555-0100",
  "company": "Acme Corp",
  "source": "landing-page",
  "funnelStep": "opt-in",
  "metadata": { "campaign": "summer-launch" }
}
```

| Field | Type | Required |
|---|---|---|
| `email` | string (email) | yes |
| `firstName` | string | yes |
| `lastName` | string | yes |
| `phone` | string | no |
| `company` | string | no |
| `source` | string | yes |
| `funnelStep` | string | yes |
| `metadata` | object | no |

**Response `202`**

```json
{
  "messageId": "12345",
  "lead": {
    "id": "f8cf3c65-...",
    "email": "jane@example.com",
    "createdAt": "2026-06-01T12:00:00.000Z",
    ...
  }
}
```

**Response `400`** — validation failed

```json
{
  "error": "Validation failed",
  "details": [{ "path": ["email"], "message": "Invalid email" }]
}
```

### `GET /health`

Returns `{ "status": "ok" }`.

---

## Pipeline outcomes

| Outcome | Meaning |
|---|---|
| `booked` | Lead passed qualification and brand fit — discovery call created on Google Calendar |
| `disqualified` | QualifierAgent score < 60 |
| `poor-brand-fit` | EvaluatorAgent confidence < 0.65 |
| `booking-skipped` | `SKIP_CALENDAR_BOOKING=true` — pipeline ran but Calendar step was skipped |

---

## Project structure

```
src/
├── index.ts              entry point — boots HTTP server and Pub/Sub subscriber
├── config.ts             Zod-validated env vars
├── lead.ts               Lead schema and type
├── ingest.ts             validate + publish a lead
├── pubsub.ts             PubSub client wrapper
├── server.ts             Express HTTP server
├── subscriber.ts         Pub/Sub subscriber
├── processor.ts          sequential lead processing pipeline
├── test-lead.ts          local end-to-end test script
└── agents/
    ├── qualifier.ts      QualifierAgent — Claude-powered lead scoring (Haiku)
    ├── evaluator.ts      EvaluatorAgent — Claude-powered brand fit check (Haiku)
    └── calendar-booker.ts CalendarBooker — Google Calendar event creation
```
