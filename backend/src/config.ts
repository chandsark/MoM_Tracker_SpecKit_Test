import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { z } from 'zod';

// Load backend/.env without overriding variables that are already set (tests set their own).
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (process.env.NODE_ENV !== 'test' && existsSync(envFile)) {
  const parsed = parseEnv(readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(8),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

const result = EnvSchema.safeParse(process.env);
if (!result.success) {
  const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${problems}`);
}

export const config = result.data;
export type Config = typeof config;
