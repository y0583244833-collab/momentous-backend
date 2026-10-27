import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './users.controller';
import { changePasswordSchema, updateProfileSchema } from './users.schemas';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, validate({ body: updateProfileSchema }), asyncHandler(controller.updateMe));
usersRouter.patch(
  '/me/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(controller.changePassword),
);
