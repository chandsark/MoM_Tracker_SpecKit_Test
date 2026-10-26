import { pagination } from '@mom/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { pageResult, toSkipTake } from '../lib/pagination';
import { userRef } from '../lib/serialize';
import { asyncHandler, parseQuery } from '../middleware/validate';

const UserQuery = pagination.extend({ q: z.string().trim().max(100).optional() });

export const usersRouter = Router().get(
  '/users',
  asyncHandler(async (req, res) => {
    const { q, ...page } = parseQuery(UserQuery, req);
    const where = {
      deactivatedAt: null,
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }] } : {}),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { name: 'asc' }, ...toSkipTake(page) }),
      prisma.user.count({ where }),
    ]);
    res.json(pageResult(users.map(userRef), total));
  }),
);
