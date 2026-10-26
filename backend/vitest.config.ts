import { defineConfig } from 'vitest/config';

// All backend tests share one SQLite file, so they run in a single fork, one file at a time.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: './tests/globalSetup.ts',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: 'file:./test.db',
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-session-secret',
      BCRYPT_COST: '4',
      LOG_LEVEL: 'silent',
    },
  },
});
