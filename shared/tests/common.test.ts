import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { dateString, pagination, requiredText, strictObject, version } from '../src/schemas/common';

describe('dateString', () => {
  it('accepts a real calendar date', () => {
    expect(dateString.safeParse('2026-02-28').success).toBe(true);
    expect(dateString.safeParse('2028-02-29').success).toBe(true);
  });

  it.each(['2026-02-30', '26-1-1', '2026/01/01', '2026-13-01', '', '2026-1-01'])(
    'rejects %s',
    (value) => {
      expect(dateString.safeParse(value).success).toBe(false);
    },
  );
});

describe('requiredText', () => {
  const schema = requiredText(5);

  it('trims surrounding whitespace', () => {
    expect(schema.parse('  abc  ')).toBe('abc');
  });

  it('rejects text that is empty after trimming', () => {
    expect(schema.safeParse('   ').success).toBe(false);
  });

  it('rejects text over the maximum length', () => {
    expect(schema.safeParse('abcdef').success).toBe(false);
    expect(schema.safeParse('abcde').success).toBe(true);
  });
});

describe('pagination', () => {
  it('defaults page to 1 and pageSize to 50', () => {
    expect(pagination.parse({})).toEqual({ page: 1, pageSize: 50 });
  });

  it('coerces query-string numbers', () => {
    expect(pagination.parse({ page: '3', pageSize: '20' })).toEqual({ page: 3, pageSize: 20 });
  });

  it('rejects pageSize above 200 or below 1', () => {
    expect(pagination.safeParse({ pageSize: '201' }).success).toBe(false);
    expect(pagination.safeParse({ pageSize: '0' }).success).toBe(false);
  });
});

describe('version', () => {
  it('rejects values below 1', () => {
    expect(version.safeParse(0).success).toBe(false);
    expect(version.safeParse(1).success).toBe(true);
  });
});

describe('strictObject', () => {
  it('rejects unknown keys', () => {
    const schema = strictObject({ a: z.string() });
    expect(schema.safeParse({ a: 'x', b: 'y' }).success).toBe(false);
    expect(schema.safeParse({ a: 'x' }).success).toBe(true);
  });
});
