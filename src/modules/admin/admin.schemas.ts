import { z } from 'zod';
import { EVENT_TYPES } from '../../constants/options';
import { emptyToUndefined, paginationQuery, uuidSchema } from '../../utils/zod';

export const listUsersQuery = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  blocked: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  ...paginationQuery,
});

export const listAllBoardsQuery = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  eventType: z.preprocess(emptyToUndefined, z.enum(EVENT_TYPES).optional()),
  ...paginationQuery,
});

export const blockUserSchema = z.object({ isBlocked: z.boolean({ required_error: 'יש לשלוח isBlocked' }) }).strict();

export const userIdParams = z.object({ id: uuidSchema });

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type ListAllBoardsQuery = z.infer<typeof listAllBoardsQuery>;
