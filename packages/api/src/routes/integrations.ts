/**
 * API routes for the Integration catalog.
 * GET /api/integrations – list all available systems.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List all available integrations (system catalog)
router.get('/', async (_req: Request, res: Response) => {
  const integrations = await prisma.integration.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(integrations);
});

// Get a single integration
router.get('/:id', async (req: Request, res: Response) => {
  const integration = await prisma.integration.findUnique({
    where: { id: String(req.params['id']) },
  });
  if (!integration) {
    res.status(404).json({ error: 'Integrasjon ikke funnet.' });
    return;
  }
  res.json(integration);
});

// Create a new integration (admin)
router.post('/', async (req: Request, res: Response) => {
  const { name, description, category, logoUrl, authType, baseUrl } = req.body;
  const integration = await prisma.integration.create({
    data: { name, description, category, logoUrl, authType, baseUrl },
  });
  res.status(201).json(integration);
});

export default router;
