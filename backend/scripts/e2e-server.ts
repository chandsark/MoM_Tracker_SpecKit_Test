// Starts the API for Playwright: a fresh throwaway backend/prisma/e2e.db, demo seed data,
// and a relaxed sign-in rate limit (tests sign in many times per minute).
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('..', import.meta.url));

Object.assign(process.env, {
  DATABASE_URL: 'file:./e2e.db',
  NODE_ENV: 'development',
  SESSION_SECRET: 'e2e-session-secret',
  LOGIN_RATE_LIMIT: '1000',
  LOG_LEVEL: 'warn',
  PORT: process.env.E2E_API_PORT ?? '3100',
});

for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(`${backendRoot}/prisma/e2e.db${suffix}`, { force: true });
}
execSync('npx prisma migrate deploy', { cwd: backendRoot, env: process.env, stdio: 'inherit' });
execSync('npx tsx prisma/seed.ts', { cwd: backendRoot, env: process.env, stdio: 'inherit' });

await import('../src/server');
