import { notFound } from '../lib/errors';

/** Prisma `where` fragment that hides soft-deleted rows. Use on every read. */
export const notDeleted = { deletedAt: null } as const;

export function assertNotDeleted<T extends { deletedAt: Date | null }>(
  record: T | null | undefined,
): T {
  if (!record || record.deletedAt !== null) throw notFound();
  return record;
}
