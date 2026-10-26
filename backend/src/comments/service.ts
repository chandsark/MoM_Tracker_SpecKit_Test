import type { Comment } from '@mom/shared';
import { prisma } from '../db';
import { loadActionItem, meetingContext } from '../lib/context';
import { forbidden } from '../lib/errors';
import { userRef } from '../lib/serialize';
import { canComment, type PolicyUser } from '../policy';

/** Comments are append-only in v1; they carry their own author and timestamp. */
export async function createComment(
  user: PolicyUser,
  actionItemId: string,
  body: string,
): Promise<Comment> {
  const item = await loadActionItem(actionItemId);
  if (!canComment(user, meetingContext(item.meeting), item)) throw forbidden();
  const comment = await prisma.comment.create({
    data: { actionItemId, authorId: user.id, body },
    include: { author: true },
  });
  return {
    id: comment.id,
    author: userRef(comment.author),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}
