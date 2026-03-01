/**
 * API routes for viewing workflow run logs.
 * GET /api/accounts/:accountId/runs
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router({ mergeParams: true });

function p(req: Request, key: string): string {
  return String(req.params[key] ?? '');
}

// Get stats overview for an account (must be before /:runId)
router.get('/stats/overview', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const filter = { accountWorkflow: { accountId } };

  const [total, success, failed, partial] = await Promise.all([
    prisma.workflowRun.count({ where: filter }),
    prisma.workflowRun.count({ where: { ...filter, status: 'success' } }),
    prisma.workflowRun.count({ where: { ...filter, status: 'failed' } }),
    prisma.workflowRun.count({ where: { ...filter, status: 'partial' } }),
  ]);

  const recentRuns = await prisma.workflowRun.findMany({
    where: filter,
    orderBy: { startTime: 'desc' },
    take: 10,
    include: {
      accountWorkflow: {
        include: {
          workflow: { select: { name: true } },
        },
      },
    },
  });

  const activeWorkflows = await prisma.accountWorkflow.count({
    where: { accountId, isActive: true },
  });

  res.json({
    total,
    success,
    failed,
    partial,
    activeWorkflows,
    successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0',
    recentRuns,
  });
});

// List workflow runs for an account (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { status, limit, workflowId } = req.query;

  const where: Record<string, unknown> = {
    accountWorkflow: { accountId },
  };
  if (status) where['status'] = String(status);
  if (workflowId) where['accountWorkflowId'] = String(workflowId);

  const runs = await prisma.workflowRun.findMany({
    where,
    include: {
      accountWorkflow: {
        include: {
          workflow: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startTime: 'desc' },
    take: limit ? parseInt(String(limit), 10) : 50,
  });

  res.json(runs);
});

// Get a single run with details
router.get('/:runId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const run = await prisma.workflowRun.findFirst({
    where: {
      id: p(req, 'runId'),
      accountWorkflow: { accountId },
    },
    include: {
      accountWorkflow: {
        include: {
          workflow: {
            include: {
              sourceIntegration: { select: { name: true } },
              targetIntegration: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!run) {
    res.status(404).json({ error: 'Kjoringslogg ikke funnet.' });
    return;
  }

  res.json(run);
});

export default router;
