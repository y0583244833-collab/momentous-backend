import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import * as usersService from './users.service';

export async function updateMe(req: Request, res: Response) {
  res.json(await usersService.updateProfile(currentUser(req).id, req.body));
}

export async function changePassword(req: Request, res: Response) {
  await usersService.changePassword(currentUser(req).id, req.body);
  res.status(204).end();
}
