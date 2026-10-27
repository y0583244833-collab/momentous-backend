import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** The signed-in user, set by the requireAuth middleware from the JWT. */
      user?: { id: string; role: Role };
    }
  }
}

export {};
