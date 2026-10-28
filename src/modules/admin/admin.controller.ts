import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import type { ListAllBoardsQuery, ListUsersQuery } from './admin.schemas';
import * as adminService from './admin.service';

export async function listUsers(req: Request, res: Response) {
  res.json(await adminService.listUsers(req.query as unknown as ListUsersQuery));
}

export async function block(req: Request, res: Response) {
  res.json(await adminService.setBlocked(currentUser(req).id, req.params.id, req.body.isBlocked));
}

export async function deleteUser(req: Request, res: Response) {
  await adminService.deleteUser(currentUser(req).id, req.params.id);
  res.status(204).end();
}

export async function listBoards(req: Request, res: Response) {
  res.json(await adminService.listAllBoards(currentUser(req).id, req.query as unknown as ListAllBoardsQuery));
}

export async function stats(_req: Request, res: Response) {
  res.json(await adminService.getStats());
}
