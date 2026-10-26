import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Build a fresh backend/prisma/test.db from the migrations before the test run. The file only
// ever holds throwaway test data, so it is deleted and recreated rather than reset in place.
export default function setup(): void {
  const backendRoot = fileURLToPath(new URL('..', import.meta.url));
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`${backendRoot}/prisma/test.db${suffix}`, { force: true });
  }
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
