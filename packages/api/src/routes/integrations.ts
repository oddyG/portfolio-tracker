/**
 * API routes for managing integrations.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List all integrations
router.get('/', async (_req: Request, res: Response) => {
  const integrations = await prisma.integration.findMany({
    include: {
      sourceConnector: { select: { id: true, name: true, category: true } },
      destinationConnector: { select: { id: true, name: true, category: true } },
      syncRuns: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { status: true, startedAt: true, completedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(integrations);
});

// Get single integration with details
router.get('/:id', async (req: Request, res: Response) => {
  const integration = await prisma.integration.findUnique({
    where: { id: req.params['id'] },
    include: {
      sourceConnector: { select: { id: true, name: true, category: true } },
      destinationConnector: { select: { id: true, name: true, category: true } },
      syncRuns: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integrasjon ikke funnet' });
    return;
  }

  res.json(integration);
});

// Create integration
router.post('/', async (req: Request, res: Response) => {
  const {
    name,
    sourceConnectorId,
    destinationConnectorId,
    fieldMappings,
    transformRules,
    schedule,
    errorHandling,
  } = req.body;

  const integration = await prisma.integration.create({
    data: {
      name,
      sourceConnectorId,
      destinationConnectorId,
      fieldMappings: JSON.stringify(fieldMappings ?? []),
      transformRules: JSON.stringify(transformRules ?? []),
      schedule: schedule ?? 'manual',
      errorHandling: errorHandling ?? 'skip',
    },
  });

  res.status(201).json(integration);
});

// Update integration
router.put('/:id', async (req: Request, res: Response) => {
  const {
    name,
    fieldMappings,
    transformRules,
    schedule,
    status,
    errorHandling,
  } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data['name'] = name;
  if (fieldMappings !== undefined) data['fieldMappings'] = JSON.stringify(fieldMappings);
  if (transformRules !== undefined) data['transformRules'] = JSON.stringify(transformRules);
  if (schedule !== undefined) data['schedule'] = schedule;
  if (status !== undefined) data['status'] = status;
  if (errorHandling !== undefined) data['errorHandling'] = errorHandling;

  const integration = await prisma.integration.update({
    where: { id: req.params['id'] },
    data,
  });

  res.json(integration);
});

// Delete integration
router.delete('/:id', async (req: Request, res: Response) => {
  // Delete associated sync runs first
  await prisma.syncRun.deleteMany({ where: { integrationId: req.params['id'] } });
  await prisma.integration.delete({ where: { id: req.params['id'] } });
  res.status(204).end();
});

// Trigger manual sync
router.post('/:id/sync', async (req: Request, res: Response) => {
  const integration = await prisma.integration.findUnique({
    where: { id: req.params['id'] },
    include: {
      sourceConnector: true,
      destinationConnector: true,
    },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integrasjon ikke funnet' });
    return;
  }

  // Create sync run record
  const syncRun = await prisma.syncRun.create({
    data: {
      integrationId: integration.id,
      status: 'running',
    },
  });

  // In a real implementation, this would be async via a job queue.
  // For MVP, we return immediately and the sync runs in background.
  res.status(202).json({
    syncRunId: syncRun.id,
    message: 'Synkronisering startet',
  });
});

export default router;
