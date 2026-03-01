/**
 * Legacy connectors routes – kept for backward compatibility.
 * The main iPaaS API uses integrations and workflows.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List all available integration systems as "connectors"
router.get('/', async (_req: Request, res: Response) => {
  const integrations = await prisma.integration.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(integrations);
});

export default router;
