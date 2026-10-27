import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParams } from '../../utils/zod';
import * as invitationsController from '../invitations/invitations.controller';
import { createInvitationsSchema } from '../invitations/invitations.schemas';
import * as memoriesController from '../memories/memories.controller';
import { createMemorySchema, listMemoriesQuery } from '../memories/memories.schemas';
import * as controller from './boards.controller';
import { createBoardSchema, joinBoardSchema, listBoardsQuery, memberParams, updateBoardSchema } from './boards.schemas';

export const boardsRouter = Router();

boardsRouter.use(requireAuth);

// Regular users only: the admin manages the system and does not take part in boards.
boardsRouter.get('/', requireRole('USER'), validate({ query: listBoardsQuery }), asyncHandler(controller.list));
boardsRouter.post('/', requireRole('USER'), validate({ body: createBoardSchema }), asyncHandler(controller.create));
boardsRouter.post('/join', requireRole('USER'), validate({ body: joinBoardSchema }), asyncHandler(controller.join));

// Members (and the admin, for moderation).
boardsRouter.get('/:id', validate({ params: idParams }), asyncHandler(controller.get));
boardsRouter.patch(
  '/:id',
  validate({ params: idParams, body: updateBoardSchema }),
  asyncHandler(controller.update),
);
boardsRouter.delete('/:id', validate({ params: idParams }), asyncHandler(controller.remove));
boardsRouter.post('/:id/join-code', validate({ params: idParams }), asyncHandler(controller.regenerateCode));
boardsRouter.get('/:id/members', validate({ params: idParams }), asyncHandler(controller.members));
boardsRouter.delete('/:id/members/:userId', validate({ params: memberParams }), asyncHandler(controller.removeMember));
boardsRouter.post('/:id/leave', validate({ params: idParams }), asyncHandler(controller.leave));

// Memories inside a board.
boardsRouter.get(
  '/:id/memories',
  validate({ params: idParams, query: listMemoriesQuery }),
  asyncHandler(memoriesController.list),
);
boardsRouter.post(
  '/:id/memories',
  requireRole('USER'),
  validate({ params: idParams, body: createMemorySchema }),
  asyncHandler(memoriesController.create),
);

// Invitations by email (board creator only).
boardsRouter.post(
  '/:id/invitations',
  requireRole('USER'),
  validate({ params: idParams, body: createInvitationsSchema }),
  asyncHandler(invitationsController.create),
);
