import { randomBytes } from 'node:crypto';
import { prisma } from '../db';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Renew the sliding expiry at most once a day to avoid a write on every request. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

export async function createSession(userId: string): Promise<string> {
  const id = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { id, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return id;
}

export async function getSession(id: string) {
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  if (session.expiresAt.getTime() - now < SESSION_TTL_MS - RENEW_AFTER_MS) {
    await prisma.session.update({
      where: { id },
      data: { expiresAt: new Date(now + SESSION_TTL_MS) },
    });
  }
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id } });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return count;
}
