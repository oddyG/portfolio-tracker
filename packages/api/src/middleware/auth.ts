/**
 * Authentication middleware for the API.
 * Validates session tokens and injects user/account context.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      accountId?: string;
    }
  }
}

const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Allow public paths
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  // In development mode, use a default demo user
  if (process.env['NODE_ENV'] !== 'production') {
    req.userId = 'demo-user';
    req.accountId = 'demo-account';
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autentisering kreves. Send en gyldig Bearer-token.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            accountUsers: {
              include: { account: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Ugyldig eller utløpt token.' });
      return;
    }

    req.userId = session.userId;
    // Use the first account the user belongs to, or from header
    const requestedAccountId = req.headers['x-account-id'] as string;
    if (requestedAccountId) {
      const membership = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.userId,
            accountId: requestedAccountId,
          },
        },
      });
      if (membership) {
        req.accountId = requestedAccountId;
      } else {
        res.status(403).json({ error: 'Du har ikke tilgang til denne kontoen.' });
        return;
      }
    } else if (session.user.accountUsers.length > 0) {
      req.accountId = session.user.accountUsers[0].accountId;
    }

    next();
  } catch {
    res.status(500).json({ error: 'Intern serverfeil under autentisering.' });
  }
}
