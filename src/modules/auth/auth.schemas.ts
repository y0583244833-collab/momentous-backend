import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('כתובת המייל לא תקינה').max(254);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'השם צריך להכיל לפחות 2 תווים').max(60, 'השם ארוך מדי'),
    email,
    password: z.string().min(8, 'הסיסמה צריכה להכיל לפחות 8 תווים').max(72, 'הסיסמה ארוכה מדי'),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'יש להזין סיסמה'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
