/**
 * API routes for managing connectors.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { encrypt, decrypt } from '../../../core/src/utils/crypto.js';
import { getConnectorFactory, listConnectorTypes } from '../../../core/src/connectors/registry.js';

const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] ?? 'dev-key';

const router = Router();

// List available connector types
router.get('/types', (_req: Request, res: Response) => {
  res.json(listConnectorTypes());
});

// List all configured connectors
router.get('/', async (_req: Request, res: Response) => {
  const connectors = await prisma.connector.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Strip encrypted config from response
  const safe = connectors.map((c) => ({
    ...c,
    config: undefined,
    hasConfig: c.config !== '{}',
  }));

  res.json(safe);
});

// Get single connector
router.get('/:id', async (req: Request, res: Response) => {
  const connector = await prisma.connector.findUnique({
    where: { id: req.params['id'] as string },
  });

  if (!connector) {
    res.status(404).json({ error: 'Connector ikke funnet' });
    return;
  }

  res.json({ ...connector, config: undefined, hasConfig: connector.config !== '{}' });
});

// Create connector
router.post('/', async (req: Request, res: Response) => {
  const { name, type, category, config } = req.body;

  const encryptedConfig = config
    ? encrypt(JSON.stringify(config), ENCRYPTION_KEY)
    : '{}';

  const connector = await prisma.connector.create({
    data: {
      name,
      type,
      category,
      config: encryptedConfig,
    },
  });

  res.status(201).json({ ...connector, config: undefined });
});

// Update connector
router.put('/:id', async (req: Request, res: Response) => {
  const { name, type, category, config, isActive } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data['name'] = name;
  if (type !== undefined) data['type'] = type;
  if (category !== undefined) data['category'] = category;
  if (isActive !== undefined) data['isActive'] = isActive;
  if (config !== undefined) {
    data['config'] = encrypt(JSON.stringify(config), ENCRYPTION_KEY);
  }

  const connector = await prisma.connector.update({
    where: { id: req.params['id'] as string },
    data,
  });

  res.json({ ...connector, config: undefined });
});

// Delete connector
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.connector.delete({ where: { id: req.params['id'] as string } });
  res.status(204).end();
});

// Test connection
router.post('/:id/test', async (req: Request, res: Response) => {
  const connector = await prisma.connector.findUnique({
    where: { id: req.params['id'] as string },
  });

  if (!connector) {
    res.status(404).json({ error: 'Connector ikke funnet' });
    return;
  }

  const factory = getConnectorFactory(connector.category === 'regnskap' ? 'tripletex' :
    connector.category === 'nettbutikk' ? 'shopify' :
    connector.category === 'betaling' ? 'vipps' : connector.name.toLowerCase());

  if (!factory) {
    res.status(400).json({ error: `Ingen connector-implementasjon funnet for ${connector.name}` });
    return;
  }

  try {
    const instance = factory();
    const config = connector.config !== '{}' ? JSON.parse(decrypt(connector.config, ENCRYPTION_KEY)) : {};
    const authResult = await instance.authenticate({ type: 'api_key', credentials: config });

    if (!authResult.success) {
      res.json({ connected: false, error: authResult.error });
      return;
    }

    const ok = await instance.testConnection();
    res.json({ connected: ok });
  } catch (err) {
    res.json({ connected: false, error: (err as Error).message });
  }
});

// Get connector entities (metadata)
router.get('/:id/entities', async (req: Request, res: Response) => {
  const connector = await prisma.connector.findUnique({
    where: { id: req.params['id'] as string },
  });

  if (!connector) {
    res.status(404).json({ error: 'Connector ikke funnet' });
    return;
  }

  // Determine connector type from name
  const name = connector.name.toLowerCase();
  const factory = getConnectorFactory(
    name.includes('tripletex') ? 'tripletex' :
    name.includes('shopify') ? 'shopify' :
    name.includes('vipps') ? 'vipps' : name
  );

  if (!factory) {
    res.json([]);
    return;
  }

  const instance = factory();
  res.json(instance.getEntities());
});

export default router;
