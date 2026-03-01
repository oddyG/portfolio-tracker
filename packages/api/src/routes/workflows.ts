/**
 * API routes for workflow templates.
 * GET /api/workflows – list all available turnkey workflows.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List all published workflow templates
router.get('/', async (_req: Request, res: Response) => {
  const workflows = await prisma.workflow.findMany({
    where: { isPublished: true },
    include: {
      sourceIntegration: { select: { id: true, name: true, category: true, logoUrl: true } },
      targetIntegration: { select: { id: true, name: true, category: true, logoUrl: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(workflows);
});

// Get a single workflow template
router.get('/:id', async (req: Request, res: Response) => {
  const workflow = await prisma.workflow.findUnique({
    where: { id: String(req.params['id']) },
    include: {
      sourceIntegration: true,
      targetIntegration: true,
    },
  });
  if (!workflow) {
    res.status(404).json({ error: 'Arbeidsflyt ikke funnet.' });
    return;
  }
  res.json(workflow);
});

// Create a new workflow template (admin)
router.post('/', async (req: Request, res: Response) => {
  const { name, description, sourceIntegrationId, targetIntegrationId, defaultJsLogic, category } = req.body;
  const workflow = await prisma.workflow.create({
    data: { name, description, sourceIntegrationId, targetIntegrationId, defaultJsLogic, category },
  });
  res.status(201).json(workflow);
});

export default router;
