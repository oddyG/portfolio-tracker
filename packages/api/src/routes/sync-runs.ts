/**
 * API routes for viewing sync run logs.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List sync runs (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  const { integrationId, status, limit } = req.query;

  const where: Record<string, unknown> = {};
  if (integrationId) where['integrationId'] = integrationId;
  if (status) where['status'] = status;

  const syncRuns = await prisma.syncRun.findMany({
    where,
    include: {
      integration: {
        select: { id: true, name: true },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: limit ? parseInt(limit as string, 10) : 50,
  });

  res.json(syncRuns);
});

// Get single sync run with details
router.get('/:id', async (req: Request, res: Response) => {
  const syncRun = await prisma.syncRun.findUnique({
    where: { id: req.params['id'] },
    include: {
      integration: {
        select: {
          id: true,
          name: true,
          sourceConnector: { select: { name: true } },
          destinationConnector: { select: { name: true } },
        },
      },
    },
  });

  if (!syncRun) {
    res.status(404).json({ error: 'Synkroniseringskjøring ikke funnet' });
    return;
  }

  res.json(syncRun);
});

// Get stats overview
router.get('/stats/overview', async (_req: Request, res: Response) => {
  const [total, success, failed, partial] = await Promise.all([
    prisma.syncRun.count(),
    prisma.syncRun.count({ where: { status: 'success' } }),
    prisma.syncRun.count({ where: { status: 'failed' } }),
    prisma.syncRun.count({ where: { status: 'partial' } }),
  ]);

  const recentRuns = await prisma.syncRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: {
      integration: { select: { name: true } },
    },
  });

  res.json({
    total,
    success,
    failed,
    partial,
    successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0',
    recentRuns,
  });
});

export default router;
