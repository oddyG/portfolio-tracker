/**
 * Express API server for the Integrera iPaaS platform.
 */

import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';

// Routes
import authRouter from './routes/auth.js';
import integrationsRouter from './routes/integrations.js';
import workflowsRouter from './routes/workflows.js';
import accountWorkflowsRouter from './routes/account-workflows.js';
import accountVariablesRouter from './routes/account-variables.js';
import accountFunctionsRouter from './routes/account-functions.js';
import runsRouter from './routes/sync-runs.js';
import connectorsRouter from './routes/connectors.js';

const app = express();
const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(authMiddleware);

// ── Public / Global routes ─────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/connectors', connectorsRouter);

// ── Account-scoped routes ──────────────────────────────────
app.use('/api/accounts/:accountId/workflows', accountWorkflowsRouter);
app.use('/api/accounts/:accountId/variables', accountVariablesRouter);
app.use('/api/accounts/:accountId/functions', accountFunctionsRouter);
app.use('/api/accounts/:accountId/runs', runsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start
app.listen(PORT, () => {
  console.log(`[Integrera iPaaS API] Kjører på http://localhost:${PORT}`);
  console.log(`[Integrera iPaaS API] Health: http://localhost:${PORT}/api/health`);
});

export default app;
