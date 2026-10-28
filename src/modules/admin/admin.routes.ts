import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './admin.controller';
import { blockUserSchema, listAllBoardsQuery, listUsersQuery, userIdParams } from './admin.schemas';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/users', validate({ query: listUsersQuery }), asyncHandler(controller.listUsers));
adminRouter.patch(
  '/users/:id/block',
  validate({ params: userIdParams, body: blockUserSchema }),
  asyncHandler(controller.block),
);
adminRouter.delete('/users/:id', validate({ params: userIdParams }), asyncHandler(controller.deleteUser));
adminRouter.get('/boards', validate({ query: listAllBoardsQuery }), asyncHandler(controller.listBoards));
adminRouter.get('/stats', asyncHandler(controller.stats));
