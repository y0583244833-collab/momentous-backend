import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import type { ListMemoriesQuery } from './memories.schemas';
import * as memoriesService from './memories.service';

export async function list(req: Request, res: Response) {
  res.json(
    await memoriesService.listMemories(req.params.id, currentUser(req), req.query as unknown as ListMemoriesQuery),
  );
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await memoriesService.createMemory(req.params.id, currentUser(req), req.body));
}

export async function get(req: Request, res: Response) {
  res.json(await memoriesService.getMemory(req.params.id, currentUser(req)));
}

export async function update(req: Request, res: Response) {
  res.json(await memoriesService.updateMemory(req.params.id, currentUser(req), req.body));
}

export async function remove(req: Request, res: Response) {
  await memoriesService.deleteMemory(req.params.id, currentUser(req));
  res.status(204).end();
}

export async function like(req: Request, res: Response) {
  res.json(await memoriesService.like(req.params.id, currentUser(req)));
}

export async function unlike(req: Request, res: Response) {
  res.json(await memoriesService.unlike(req.params.id, currentUser(req)));
}
