import { z } from 'zod';
import { requiredText } from './common';

export const CommentCreate = z.strictObject({ body: requiredText(1000) });
export type CommentCreate = z.infer<typeof CommentCreate>;
