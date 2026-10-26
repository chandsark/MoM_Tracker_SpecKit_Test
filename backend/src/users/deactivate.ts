import { prisma } from '../db';

/**
 * Removes a user from the system (spec edge case): they can no longer sign in, their sessions end,
 * their history stays visible by name, and their open action items show "needs reassignment".
 * Deactivating an already deactivated user leaves it unchanged.
 */
export async function deactivateUser(email: string): Promise<{ id: string; deactivatedAt: Date }> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw new Error(`No user with email ${normalized}`);
  if (user.deactivatedAt) return { id: user.id, deactivatedAt: user.deactivatedAt };

  const deactivatedAt = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { deactivatedAt } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return { id: user.id, deactivatedAt };
}
