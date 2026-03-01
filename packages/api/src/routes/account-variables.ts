/**
 * API routes for account-scoped variables ($v).
 * Scoped to /api/accounts/:accountId/variables
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router({ mergeParams: true });

function p(req: Request, key: string): string {
  return String(req.params[key] ?? '');
}

// List all variables for an account
router.get('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const variables = await prisma.accountVariable.findMany({
    where: { accountId },
    orderBy: { key: 'asc' },
  });

  const safe = variables.map((v) => ({
    ...v,
    valueJson: v.isSecret ? '"********"' : v.valueJson,
  }));

  res.json(safe);
});

// Get a single variable
router.get('/:varId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const variable = await prisma.accountVariable.findFirst({
    where: { id: p(req, 'varId'), accountId },
  });
  if (!variable) {
    res.status(404).json({ error: 'Variabel ikke funnet.' });
    return;
  }
  res.json({
    ...variable,
    valueJson: variable.isSecret ? '"********"' : variable.valueJson,
  });
});

// Create or update a variable
router.post('/', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { key, valueJson, isSecret } = req.body;

  if (!key) {
    res.status(400).json({ error: 'Nokkel (key) er pakrevd.' });
    return;
  }

  const variable = await prisma.accountVariable.upsert({
    where: { accountId_key: { accountId, key } },
    update: {
      valueJson: JSON.stringify(valueJson),
      isSecret: isSecret ?? false,
    },
    create: {
      accountId,
      key,
      valueJson: JSON.stringify(valueJson),
      isSecret: isSecret ?? false,
    },
  });

  res.status(201).json({
    ...variable,
    valueJson: variable.isSecret ? '"********"' : variable.valueJson,
  });
});

// Update a variable
router.put('/:varId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  const { key, valueJson, isSecret } = req.body;

  const data: Record<string, unknown> = {};
  if (key !== undefined) data['key'] = key;
  if (valueJson !== undefined) data['valueJson'] = JSON.stringify(valueJson);
  if (isSecret !== undefined) data['isSecret'] = isSecret;

  try {
    const variable = await prisma.accountVariable.update({
      where: { id: p(req, 'varId'), accountId },
      data,
    });
    res.json({
      ...variable,
      valueJson: variable.isSecret ? '"********"' : variable.valueJson,
    });
  } catch {
    res.status(404).json({ error: 'Variabel ikke funnet.' });
  }
});

// Delete a variable
router.delete('/:varId', async (req: Request, res: Response) => {
  const accountId = p(req, 'accountId');
  try {
    await prisma.accountVariable.delete({
      where: { id: p(req, 'varId'), accountId },
    });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Variabel ikke funnet.' });
  }
});

export default router;
