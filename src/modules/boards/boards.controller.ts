import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import type { ListBoardsQuery } from './boards.schemas';
import * as boardsService from './boards.service';

export async function list(req: Request, res: Response) {
  res.json(await boardsService.listMyBoards(currentUser(req), req.query as unknown as ListBoardsQuery));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await boardsService.createBoard(currentUser(req), req.body));
}

export async function join(req: Request, res: Response) {
  res.json(await boardsService.joinBoard(currentUser(req), req.body.code));
}

export async function get(req: Request, res: Response) {
  res.json(await boardsService.getBoard(req.params.id, currentUser(req)));
}

export async function update(req: Request, res: Response) {
  res.json(await boardsService.updateBoard(req.params.id, currentUser(req), req.body));
}

export async function remove(req: Request, res: Response) {
  await boardsService.deleteBoard(req.params.id, currentUser(req));
  res.status(204).end();
}

export async function regenerateCode(req: Request, res: Response) {
  res.json(await boardsService.regenerateJoinCode(req.params.id, currentUser(req)));
}

export async function members(req: Request, res: Response) {
  res.json(await boardsService.listMembers(req.params.id, currentUser(req)));
}

export async function removeMember(req: Request, res: Response) {
  await boardsService.removeMember(req.params.id, currentUser(req), req.params.userId);
  res.status(204).end();
}

export async function leave(req: Request, res: Response) {
  await boardsService.leaveBoard(req.params.id, currentUser(req));
  res.status(204).end();
}
