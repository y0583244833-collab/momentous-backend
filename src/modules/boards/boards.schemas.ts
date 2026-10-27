import { z } from 'zod';
import { EVENT_TYPES } from '../../constants/options';
import { JOIN_CODE_LENGTH } from '../../utils/joinCode';
import { optionalEmailList } from '../invitations/invitations.schemas';
import { dateOnlySchema, emptyToUndefined, paginationQuery, uuidSchema } from '../../utils/zod';

const name = z.string().trim().min(2, 'שם הלוח צריך להכיל לפחות 2 תווים').max(80, 'שם הלוח ארוך מדי');
const description = z.string().trim().max(1000, 'התיאור ארוך מדי');
const eventType = z.enum(EVENT_TYPES, { errorMap: () => ({ message: 'סוג האירוע לא תקין' }) });

export const createBoardSchema = z
  .object({
    name,
    description: description.nullable().optional(),
    eventType,
    eventDate: dateOnlySchema,
    coverImageId: uuidSchema.nullable().optional(),
    // Optional: email addresses to invite right away. Same rules as POST /api/boards/:id/invitations.
    emails: optionalEmailList,
  })
  .strict();

export const updateBoardSchema = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    eventType: eventType.optional(),
    eventDate: dateOnlySchema.optional(),
    coverImageId: uuidSchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'יש לשלוח לפחות שדה אחד לעדכון');

export const joinBoardSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .length(JOIN_CODE_LENGTH, `קוד ההצטרפות צריך להכיל ${JOIN_CODE_LENGTH} תווים`),
  })
  .strict();

export const listBoardsQuery = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  eventType: z.preprocess(emptyToUndefined, eventType.optional()),
  from: z.preprocess(emptyToUndefined, dateOnlySchema.optional()),
  to: z.preprocess(emptyToUndefined, dateOnlySchema.optional()),
  role: z.preprocess(emptyToUndefined, z.enum(['created', 'joined']).optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(['eventDate', 'name', 'lastActivity']).default('lastActivity')),
  order: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default('desc')),
  ...paginationQuery,
});

export const memberParams = z.object({ id: uuidSchema, userId: uuidSchema });

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type ListBoardsQuery = z.infer<typeof listBoardsQuery>;
