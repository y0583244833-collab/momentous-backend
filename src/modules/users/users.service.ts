import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../utils/httpError';
import { toUserProfile } from '../../utils/serializers';
import { assertOwnImage, deleteImageIfUnused } from '../images/images.service';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas';

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא');

  if (input.avatarImageId) await assertOwnImage(input.avatarImageId, userId);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { fullName: input.fullName, avatarImageId: input.avatarImageId },
  });

  if (input.avatarImageId !== undefined && user.avatarImageId !== updated.avatarImageId) {
    await deleteImageIfUnused(user.avatarImageId);
  }
  return toUserProfile(updated);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('המשתמש לא נמצא');

  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  // 400 and not 401: the user is signed in, only the "current password" field is wrong.
  if (!ok) throw badRequest('הסיסמה הנוכחית שגויה', 'WRONG_PASSWORD');
  if (input.currentPassword === input.newPassword) {
    throw badRequest('הסיסמה החדשה חייבת להיות שונה מהנוכחית', 'SAME_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
