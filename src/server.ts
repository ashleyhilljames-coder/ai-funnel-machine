import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ES Modules __dirname requirement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default app;