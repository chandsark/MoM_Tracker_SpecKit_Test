import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../../src/lib/errors';
import { errorHandler } from '../../src/middleware/errorHandler';

function appThrowing(error: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps an AppError to its status and code', async () => {
    const res = await request(appThrowing(new AppError(403, 'FORBIDDEN', 'Nope'))).get('/boom');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: 'FORBIDDEN', message: 'Nope' } });
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with per-field details', async () => {
    const result = z.object({ name: z.string().min(1, 'Required') }).safeParse({ name: '' });
    const res = await request(appThrowing(result.error)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fields).toEqual({ name: ['Required'] });
  });

  it('hides unknown errors behind a generic 500 without a stack trace', async () => {
    const res = await request(appThrowing(new Error('database exploded at line 42'))).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('exploded');
    expect(JSON.stringify(res.body)).not.toContain('at ');
  });
});
