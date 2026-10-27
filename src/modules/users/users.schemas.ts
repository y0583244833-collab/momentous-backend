import { z } from 'zod';
import { uuidSchema } from '../../utils/zod';

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'השם צריך להכיל לפחות 2 תווים').max(60, 'השם ארוך מדי').optional(),
    // null removes the profile picture
    avatarImageId: uuidSchema.nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'יש לשלוח לפחות שדה אחד לעדכון');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'יש להזין את הסיסמה הנוכחית'),
    newPassword: z.string().min(8, 'הסיסמה החדשה צריכה להכיל לפחות 8 תווים').max(72, 'הסיסמה ארוכה מדי'),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
