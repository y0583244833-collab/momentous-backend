import { z } from 'zod';
import { MEMORY_TYPES } from '../../constants/options';
import { dateOnlySchema, emptyToUndefined, httpUrlSchema, paginationQuery, uuidSchema } from '../../utils/zod';

const type = z.enum(MEMORY_TYPES, { errorMap: () => ({ message: 'סוג הזיכרון לא תקין' }) });
const title = z.string().trim().min(2, 'הכותרת צריכה להכיל לפחות 2 תווים').max(120, 'הכותרת ארוכה מדי');
const content = z.string().trim().min(1, 'יש לכתוב תוכן').max(5000, 'התוכן ארוך מדי');

const photoNeedsImage = (v: { type?: string; imageId?: string | null }) => v.type !== 'PHOTO' || Boolean(v.imageId);

export const createMemorySchema = z
  .object({
    title,
    content,
    type,
    imageId: uuidSchema.nullable().optional(),
    placeUrl: httpUrlSchema.nullable().optional(),
    happenedAt: dateOnlySchema.nullable().optional(),
  })
  .strict()
  .refine(photoNeedsImage, { message: 'בזיכרון מסוג תמונה חובה לצרף תמונה', path: ['imageId'] });

export const updateMemorySchema = z
  .object({
    title: title.optional(),
    content: content.optional(),
    type: type.optional(),
    imageId: uuidSchema.nullable().optional(),
    placeUrl: httpUrlSchema.nullable().optional(),
    happenedAt: dateOnlySchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'יש לשלוח לפחות שדה אחד לעדכון');

export const listMemoriesQuery = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  type: z.preprocess(emptyToUndefined, type.optional()),
  authorId: z.preprocess(emptyToUndefined, uuidSchema.optional()),
  mine: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()).transform((v) => v === 'true'),
  sort: z.preprocess(emptyToUndefined, z.enum(['newest', 'mostLiked', 'happenedAt']).default('newest')),
  ...paginationQuery,
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type ListMemoriesQuery = z.infer<typeof listMemoriesQuery>;
