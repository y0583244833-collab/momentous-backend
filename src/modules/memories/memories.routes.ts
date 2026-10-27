import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParams } from '../../utils/zod';
import * as controller from './memories.controller';
import { updateMemorySchema } from './memories.schemas';

// List and create live under /api/boards/:id/memories (see boards.routes.ts).
export const memoriesRouter = Router();

memoriesRouter.use(requireAuth);

memoriesRouter.get('/:id', validate({ params: idParams }), asyncHandler(controller.get));
memoriesRouter.patch(
  '/:id',
  requireRole('USER'),
  validate({ params: idParams, body: updateMemorySchema }),
  asyncHandler(controller.update),
);
memoriesRouter.delete('/:id', validate({ params: idParams }), asyncHandler(controller.remove));
memoriesRouter.post('/:id/like', requireRole('USER'), validate({ params: idParams }), asyncHandler(controller.like));
memoriesRouter.delete('/:id/like', requireRole('USER'), validate({ params: idParams }), asyncHandler(controller.unlike));
