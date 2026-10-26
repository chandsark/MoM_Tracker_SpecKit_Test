import { CommentCreate } from '@mom/shared';
import { Router } from 'express';
import { currentUser } from '../lib/serialize';
import { asyncHandler, validateBody } from '../middleware/validate';
import { createComment } from './service';

export const commentsRouter = Router().post(
  '/action-items/:actionItemId/comments',
  validateBody(CommentCreate),
  asyncHandler(async (req, res) => {
    const { body } = req.body as CommentCreate;
    res.status(201).json(await createComment(currentUser(req), req.params.actionItemId!, body));
  }),
);
