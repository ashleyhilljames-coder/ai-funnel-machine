import express, { type Request, type Response } from 'express';
import { ingestLead, type IngestInput } from './ingest.js';

const app = express();
app.use(express.json());

app.post('/leads', async (req: Request, res: Response) => {
  try {
    const result = await ingestLead(req.body as IngestInput);
    res.status(202).json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as unknown as { errors: unknown }).errors });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
