/**
 * API routes for account-scoped reusable functions ($u).
 * Scoped to /api/accounts/:accountId/functions
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router({ mergeParams: true });

function p(req: Request, key: string): string {
  return String(req.params[key] ?? '');
}

// List all custom functions for an account
router.get('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const functions = await prisma.accountFunction.findMany({
    where: { accountId },
    orderBy: { functionName: 'asc' },
  });
  res.json(functions);
});

// Get a single function
router.get('/:fnId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const fn = await prisma.accountFunction.findFirst({
    where: { id: p(req, 'fnId'), accountId },
  });
  if (!fn) {
    res.status(404).json({ error: 'Funksjon ikke funnet.' });
    return;
  }
  res.json(fn);
});

// Create or update a function
router.post('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { functionName, jsCode, description } = req.body;

  if (!functionName || !jsCode) {
    res.status(400).json({ error: 'Funksjonsnavn og JavaScript-kode er pakrevd.' });
    return;
  }

  const fn = await prisma.accountFunction.upsert({
    where: { accountId_functionName: { accountId, functionName } },
    update: {
      jsCode,
      description: description ?? '',
    },
    create: {
      accountId,
      functionName,
      jsCode,
      description: description ?? '',
    },
  });

  res.status(201).json(fn);
});

// Update a function
router.put('/:fnId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { functionName, jsCode, description } = req.body;

  const data: Record<string, unknown> = {};
  if (functionName !== undefined) data['functionName'] = functionName;
  if (jsCode !== undefined) data['jsCode'] = jsCode;
  if (description !== undefined) data['description'] = description;

  try {
    const fn = await prisma.accountFunction.update({
      where: { id: p(req, 'fnId'), accountId },
      data,
    });
    res.json(fn);
  } catch {
    res.status(404).json({ error: 'Funksjon ikke funnet.' });
  }
});

// Delete a function
router.delete('/:fnId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  try {
    await prisma.accountFunction.delete({
      where: { id: p(req, 'fnId'), accountId },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Funksjon ikke funnet.' });
  }
});

export default router;
