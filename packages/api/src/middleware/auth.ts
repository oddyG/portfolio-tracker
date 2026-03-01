/**
 * Simple auth middleware for the API.
 * In production this would validate JWT tokens or API keys.
 */

import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // For MVP/development: allow all requests
  // In production: validate API key or session token
  const apiKey = req.headers['x-api-key'];

  if (process.env['NODE_ENV'] === 'production' && !apiKey) {
    res.status(401).json({ error: 'API-nøkkel mangler' });
    return;
  }

  next();
}
