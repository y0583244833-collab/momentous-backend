import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import type { ListInvitationsQuery } from './invitations.schemas';
import * as invitationsService from './invitations.service';

export async function create(req: Request, res: Response) {
  res.json(await invitationsService.createInvitations(req.params.id, currentUser(req), req.body));
}

export async function listMine(req: Request, res: Response) {
  res.json(
    await invitationsService.listMyInvitations(currentUser(req), req.query as unknown as ListInvitationsQuery),
  );
}

export async function pendingCount(req: Request, res: Response) {
  res.json(await invitationsService.pendingCount(currentUser(req)));
}

export async function accept(req: Request, res: Response) {
  res.json(await invitationsService.acceptInvitation(req.params.id, currentUser(req)));
}

export async function decline(req: Request, res: Response) {
  res.json(await invitationsService.declineInvitation(req.params.id, currentUser(req)));
}
