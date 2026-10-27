import type { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { forbidden, unauthorized } from '../utils/httpError';

interface TokenPayload {
  sub: string;
  role: Role;
}

export const signToken = (user: { id: string; role: Role }): string =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });

/**
 * Requires a valid "Authorization: Bearer <token>" header.
 * The user is always taken from the token and re-loaded from the database,
 * so deleted or blocked users lose access immediately.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('חסר Token. יש להתחבר ולשלוח Authorization: Bearer <token>', 'TOKEN_MISSING');
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as unknown as TokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw unauthorized('תוקף ה־Token פג. יש להתחבר מחדש', 'TOKEN_EXPIRED');
      }
      throw unauthorized('ה־Token לא תקין', 'TOKEN_INVALID');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isBlocked: true },
    });
    if (!user) throw unauthorized('המשתמש לא קיים יותר', 'TOKEN_INVALID');
    if (user.isBlocked) throw forbidden('החשבון חסום על ידי בעל המערכת', 'USER_BLOCKED');

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Allows only the given roles. Must run after requireAuth. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        forbidden(
          roles.includes('ADMIN') ? 'הפעולה מותרת רק לבעל המערכת' : 'הפעולה מותרת רק למשתמש רגיל',
          'ROLE_FORBIDDEN',
        ),
      );
    }
    next();
  };

/** Returns the signed-in user. Use only in routes protected by requireAuth. */
export const currentUser = (req: Request) => {
  if (!req.user) throw unauthorized();
  return req.user;
};
