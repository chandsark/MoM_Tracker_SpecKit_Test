import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/** SQLite tuning: write-ahead logging for concurrent readers, and wait instead of failing on locks. */
export async function initDb(): Promise<void> {
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
}
