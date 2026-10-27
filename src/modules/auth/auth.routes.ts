import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
authRouter.get('/me', requireAuth, asyncHandler(controller.me));
