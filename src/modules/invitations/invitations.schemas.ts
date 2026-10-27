import { z } from 'zod';
import { emptyToUndefined, paginationQuery } from '../../utils/zod';

export const MAX_EMAILS_PER_REQUEST = 20;

const email = z.string().trim().toLowerCase().email('כתובת המייל לא תקינה').max(254, 'כתובת המייל ארוכה מדי');

/**
 * A list of email addresses to invite. Shared by POST /api/boards/:id/invitations and POST /api/boards,
 * so both follow the same rules: valid emails, at most 20, trimmed, lowercase, duplicates removed.
 */
const emailList = z
  .array(email, { required_error: 'יש לשלוח מערך emails', invalid_type_error: 'emails צריך להיות מערך' })
  .max(MAX_EMAILS_PER_REQUEST, `אפשר להזמין עד ${MAX_EMAILS_PER_REQUEST} כתובות בבקשה אחת`);

const unique = (list: string[]) => [...new Set(list)];

/** Optional list for creating a board. Missing or empty means "no invitations". */
export const optionalEmailList = emailList.transform(unique).optional();

export const createInvitationsSchema = z
  .object({
    emails: emailList.min(1, 'יש לשלוח לפחות כתובת מייל אחת').transform(unique),
  })
  .strict();

export const listInvitationsQuery = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(['PENDING', 'ACCEPTED', 'DECLINED']).default('PENDING')),
  ...paginationQuery,
});

export type CreateInvitationsInput = z.infer<typeof createInvitationsSchema>;
export type ListInvitationsQuery = z.infer<typeof listInvitationsQuery>;
