import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/supabase';
import { auditLog } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Auth middleware: verifies the Bearer JWT from Supabase.
 * Sets req.userId from the verified token — never from the request body.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const userId = await verifyToken(token);

  if (!userId) {
    auditLog('INVALID_TOKEN', 'unknown', { ip: req.ip, path: req.path });
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.userId = userId;
  next();
}

/**
 * Validate that a resource belongs to the authenticated user.
 * This is a defense-in-depth check on top of Supabase RLS.
 */
export function validateOwnership(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}
