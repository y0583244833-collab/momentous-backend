import { createHash } from 'node:crypto';
import { prisma } from '../../db/prisma';
import { badRequest, forbidden, notFound } from '../../utils/httpError';
import { imageUrl } from '../../utils/serializers';

/** Detects the real image type from the file's first bytes (not from its name). */
export function detectImageType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** A fingerprint of the file content: identical files get the same hash, whatever their names. */
export const hashContent = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

export async function uploadImage(uploaderId: string, file: Express.Multer.File | undefined) {
  if (!file) throw badRequest('יש לצרף קובץ בשדה file', 'FILE_MISSING');
  const mimeType = detectImageType(file.buffer);
  if (!mimeType) throw badRequest('אפשר להעלות רק תמונות JPG, PNG או WEBP', 'INVALID_FILE_TYPE');

  const image = await prisma.image.create({
    data: {
      data: new Uint8Array(file.buffer),
      mimeType,
      sizeBytes: file.size,
      contentHash: hashContent(file.buffer),
      uploaderId,
    },
    select: { id: true, mimeType: true, sizeBytes: true, contentHash: true },
  });
  return { ...image, url: imageUrl(image.id) };
}

export async function getImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id }, select: { data: true, mimeType: true } });
  if (!image) throw notFound('התמונה לא נמצאה');
  return image;
}

/** Makes sure an image exists and belongs to the user before it is attached to something. */
export async function assertOwnImage(imageId: string, userId: string) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: { id: true, uploaderId: true, contentHash: true },
  });
  if (!image) throw badRequest('התמונה לא נמצאה. יש להעלות אותה קודם', 'IMAGE_NOT_FOUND');
  if (image.uploaderId !== userId) throw forbidden('אפשר לצרף רק תמונה שהעלית בעצמך', 'IMAGE_NOT_OWNED');
  return image;
}

/** Deletes an image that nothing points to anymore. */
export async function deleteImageIfUnused(imageId: string | null | undefined) {
  if (!imageId) return;
  const [avatars, covers, memories] = await Promise.all([
    prisma.user.count({ where: { avatarImageId: imageId } }),
    prisma.board.count({ where: { coverImageId: imageId } }),
    prisma.memory.count({ where: { imageId } }),
  ]);
  if (avatars + covers + memories === 0) {
    await prisma.image.deleteMany({ where: { id: imageId } });
  }
}
