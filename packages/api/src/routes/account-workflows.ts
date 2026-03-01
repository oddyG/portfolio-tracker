/**
 * API routes for account-specific workflow instances.
 * Scoped to /api/accounts/:accountId/workflows
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { runWorkflow } from '../../../core/src/engine/workflow-runner.js';

const router = Router({ mergeParams: true });

function p(req: Request, key: string): string {
  return String(req.params[key] ?? req[key as keyof Request] ?? '');
}

// List all active workflows for an account
router.get('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const accountWorkflows = await prisma.accountWorkflow.findMany({
    where: { accountId },
    include: {
      workflow: {
        include: {
          sourceIntegration: { select: { id: true, name: true, category: true, logoUrl: true } },
          targetIntegration: { select: { id: true, name: true, category: true, logoUrl: true } },
        },
      },
      workflowRuns: {
        orderBy: { startTime: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accountWorkflows);
});

// Get a single account workflow with details
router.get('/:workflowId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const aw = await prisma.accountWorkflow.findFirst({
    where: { id: p(req, 'workflowId'), accountId },
    include: {
      workflow: {
        include: {
          sourceIntegration: true,
          targetIntegration: true,
        },
      },
      workflowRuns: {
        orderBy: { startTime: 'desc' },
        take: 20,
      },
    },
  });
  if (!aw) {
    res.status(404).json({ error: 'Arbeidsflyt ikke funnet for denne kontoen.' });
    return;
  }
  res.json(aw);
});

// Activate a workflow for an account (create an AccountWorkflow)
router.post('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { workflowId, scheduleCronExpression, customJsLogic } = req.body;

  const existing = await prisma.accountWorkflow.findUnique({
    where: { accountId_workflowId: { accountId, workflowId } },
  });
  if (existing) {
    res.status(409).json({ error: 'Denne arbeidsflyten er allerede aktivert for kontoen.' });
    return;
  }

  const aw = await prisma.accountWorkflow.create({
    data: {
      accountId,
      workflowId,
      scheduleCronExpression: scheduleCronExpression ?? 'manual',
      customJsLogic: customJsLogic ?? null,
      isActive: true,
    },
    include: {
      workflow: {
        include: {
          sourceIntegration: { select: { id: true, name: true, category: true } },
          targetIntegration: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });

  res.status(201).json(aw);
});

// Update an active workflow (change logic, schedule, deactivate)
router.put('/:workflowId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { isActive, scheduleCronExpression, customJsLogic } = req.body;

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data['isActive'] = isActive;
  if (scheduleCronExpression !== undefined) data['scheduleCronExpression'] = scheduleCronExpression;
  if (customJsLogic !== undefined) data['customJsLogic'] = customJsLogic;

  try {
    const aw = await prisma.accountWorkflow.update({
      where: { id: p(req, 'workflowId'), accountId },
      data,
      include: {
        workflow: {
          include: {
            sourceIntegration: { select: { id: true, name: true, category: true } },
            targetIntegration: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });
    res.json(aw);
  } catch {
    res.status(404).json({ error: 'Arbeidsflyt ikke funnet.' });
  }
});

// Delete (deactivate) an account workflow
router.delete('/:workflowId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  try {
    await prisma.accountWorkflow.delete({
      where: { id: p(req, 'workflowId'), accountId },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Arbeidsflyt ikke funnet.' });
  }
});

// Trigger manual execution of a workflow
router.post('/:workflowId/run', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const aw = await prisma.accountWorkflow.findFirst({
    where: { id: p(req, 'workflowId'), accountId },
    include: { workflow: true },
  });

  if (!aw) {
    res.status(404).json({ error: 'Arbeidsflyt ikke funnet.' });
    return;
  }

  // Load account variables and functions
  const [variables, functions] = await Promise.all([
    prisma.accountVariable.findMany({ where: { accountId } }),
    prisma.accountFunction.findMany({ where: { accountId } }),
  ]);

  const varMap: Record<string, unknown> = {};
  for (const v of variables) {
    try { varMap[v.key] = JSON.parse(v.valueJson); } catch { varMap[v.key] = v.valueJson; }
  }

  const fnMap: Record<string, string> = {};
  for (const f of functions) {
    fnMap[f.functionName] = f.jsCode;
  }

  const run = await prisma.workflowRun.create({
    data: { accountWorkflowId: aw.id, status: 'running' },
  });

  const jsLogic = aw.customJsLogic ?? aw.workflow.defaultJsLogic;
  const result = runWorkflow({
    accountWorkflowId: aw.id,
    workflowName: aw.workflow.name,
    jsLogic,
    variables: varMap,
    functions: fnMap,
  });

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: result.success ? 'success' : 'failed',
      endTime: new Date(),
      logOutput: result.logs.join('\n'),
      errorMessage: result.error ?? null,
    },
  });

  await prisma.accountWorkflow.update({
    where: { id: aw.id },
    data: { lastRunAt: new Date() },
  });

  res.json({
    runId: run.id,
    success: result.success,
    returnValue: result.returnValue,
    logs: result.logs,
    error: result.error,
  });
});

export default router;
