# AI Funnel Machine

A TypeScript Node.js service that ingests leads via HTTP, validates and publishes them to Google Cloud Pub/Sub, and processes them through an AI-powered qualification pipeline.

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
     └── CalendarBooker    schedule a discovery call
```

## Setup

```bash
cp .env.example .env
# fill in values in .env
npm install
```

### Environment variables

| Variable | Description |
|---|---|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID |
| `PUBSUB_TOPIC` | Pub/Sub topic name for lead ingestion |
| `PUBSUB_SUBSCRIPTION` | Pub/Sub subscription name for lead processing |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI agents |
| `NODE_ENV` | `development` \| `production` \| `test` (default: `development`) |
| `PORT` | HTTP server port (default: `3000`) |

## Usage

### Development

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

## API

### `POST /leads`

Ingest a new lead. Validates the payload, assigns a UUID and timestamp, and publishes to Pub/Sub.

**Request body**

```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "company": "Acme Corp",
  "source": "landing-page",
  "funnelStep": "opt-in",
  "metadata": {}
}
```

**Response `202`**

```json
{
  "messageId": "12345",
  "lead": { "id": "...", "createdAt": "...", ... }
}
```

### `GET /health`

Returns `{ "status": "ok" }`.

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
└── agents/
    ├── qualifier.ts      QualifierAgent — Claude-powered lead scoring
    ├── evaluator.ts      EvaluatorAgent — Claude-powered brand fit check
    └── calendar-booker.ts CalendarBooker — discovery call scheduling
```
