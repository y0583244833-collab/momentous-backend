import { z } from 'zod';

export const uuidSchema = z.string().uuid('מזהה לא תקין');

export const idParams = z.object({ id: uuidSchema });

/** "YYYY-MM-DD" that is a real calendar date. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'התאריך צריך להיות בפורמט YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'התאריך לא קיים');

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048, 'הקישור ארוך מדי')
  .url('הקישור לא תקין')
  .refine((v) => /^https?:\/\//i.test(v), 'הקישור חייב להתחיל ב־http או https');

/** Turns an empty query-string value into undefined. */
export const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const paginationQuery = {
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(20)),
};
