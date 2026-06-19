import express from 'express';
import path from 'path';
import { ingestLead } from './ingest.js';
import { ZodError, type ZodIssue } from 'zod';

const app = express();

// Global Middleware
app.use(express.json());

// 📂 Tell Express exactly where to find the public directory using an absolute path
app.use(express.static(path.join(__dirname, '../public')));

// 📋 Standard Intake Route
app.post('/api/intake', async (req, res) => {
  console.log('📥 Received standard intake payload:', req.body);
  res.status(200).json({ status: 'received' });
});

// 🚀 Production Intake Route with Zod Validation & Pub/Sub Publishing
app.post('/api/leads', async (req, res) => {
  try {
    const { messageId, lead } = await ingestLead(req.body);
    res.status(202).json({
      success: true,
      messageId,
      leadId: lead.id,
      createdAt: lead.createdAt,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('⚠️ Incoming lead validation failed:', error.issues);
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    console.error('❌ Ingestion pipeline failure:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing lead',
    });
  }
});

export default app;