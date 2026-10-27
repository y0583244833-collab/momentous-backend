import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { signToken } from '../../middleware/auth';
import { conflict, forbidden, notFound, unauthorized } from '../../utils/httpError';
import { toUserProfile } from '../../utils/serializers';
import type { LoginInput, RegisterInput } from './auth.schemas';

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw conflict('כתובת המייל כבר רשומה במערכת', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  // Registration always creates a regular user. Admins are created only by the seed script.
  const user = await prisma.user.create({
    data: { fullName: input.fullName, email: input.email, passwordHash, role: 'USER' },
  });
  return { token: signToken(user), user: toUserProfile(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !ok) throw unauthorized('המייל או הסיסמה שגויים', 'INVALID_CREDENTIALS');
  if (user.isBlocked) throw forbidden('החשבון חסום על ידי בעל המערכת', 'USER_BLOCKED');
  return { token: signToken(user), user: toUserProfile(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא');
  return toUserProfile(user);
}
