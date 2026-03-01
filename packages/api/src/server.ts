/**
 * Express API server for the Integrera framework.
 */

import express from 'express';
import cors from 'cors';
import connectorsRouter from './routes/connectors.js';
import integrationsRouter from './routes/integrations.js';
import syncRunsRouter from './routes/sync-runs.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/api/connectors', connectorsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/sync-runs', syncRunsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
app.listen(PORT, () => {
  console.log(`[Integrera API] Kjører på http://localhost:${PORT}`);
  console.log(`[Integrera API] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
