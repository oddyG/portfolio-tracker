/**
 * Authentication routes – register, login, logout, session info.
 */

import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db.js';

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Register a new user and create their account
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, accountName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-post og passord er påkrevd.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'En bruker med denne e-postadressen finnes allerede.' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: name ?? email.split('@')[0],
    },
  });

  // Create a default account for this user
  const account = await prisma.account.create({
    data: {
      name: accountName ?? `${user.name ?? user.email}'s organisasjon`,
      ownerId: user.id,
      accountUsers: {
        create: {
          userId: user.id,
          role: 'owner',
        },
      },
    },
  });

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    account: { id: account.id, name: account.name },
    token,
    expiresAt: expiresAt.toISOString(),
  });
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-post og passord er påkrevd.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accountUsers: {
        include: { account: true },
        take: 1,
      },
    },
  });

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: 'Ugyldig e-post eller passord.' });
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  const account = user.accountUsers[0]?.account;

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    account: account ? { id: account.id, name: account.name } : null,
    token,
    expiresAt: expiresAt.toISOString(),
  });
});

// Get current session
router.get('/me', async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Ikke autentisert.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      accountUsers: {
        include: { account: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'Bruker ikke funnet.' });
    return;
  }

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accounts: user.accountUsers.map((au) => ({
      id: au.account.id,
      name: au.account.name,
      role: au.role,
    })),
    currentAccountId: req.accountId,
  });
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await prisma.session.deleteMany({ where: { token } });
  }
  res.json({ message: 'Logget ut.' });
});

export default router;
