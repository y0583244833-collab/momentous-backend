import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { idParams } from '../../utils/zod';
import * as controller from './invitations.controller';
import { listInvitationsQuery } from './invitations.schemas';

// Sending invitations lives under /api/boards/:id/invitations (see boards.routes.ts).
export const invitationsRouter = Router();

// Regular users only: the admin does not take part in boards.
invitationsRouter.use(requireAuth, requireRole('USER'));

invitationsRouter.get('/', validate({ query: listInvitationsQuery }), asyncHandler(controller.listMine));
// Fixed paths come before the "/:id" paths.
invitationsRouter.get('/pending-count', asyncHandler(controller.pendingCount));
invitationsRouter.post('/:id/accept', validate({ params: idParams }), asyncHandler(controller.accept));
invitationsRouter.post('/:id/decline', validate({ params: idParams }), asyncHandler(controller.decline));
