import { describe, expect, it } from 'vitest';
import { isOverdue, resolveToday, todayUtc } from '../../src/lib/dates';

describe('isOverdue', () => {
  const today = '2026-10-26';

  it('is true when the due date is before today and the item is still open', () => {
    expect(isOverdue('2026-10-25', 'OPEN', today)).toBe(true);
    expect(isOverdue('2026-10-01', 'IN_PROGRESS', today)).toBe(true);
  });

  it('treats a past-due BLOCKED item as overdue', () => {
    expect(isOverdue('2026-10-25', 'BLOCKED', today)).toBe(true);
  });

  it('is false on the due date itself', () => {
    expect(isOverdue('2026-10-26', 'OPEN', today)).toBe(false);
  });

  it('is false for DONE and CANCELLED items', () => {
    expect(isOverdue('2026-10-01', 'DONE', today)).toBe(false);
    expect(isOverdue('2026-10-01', 'CANCELLED', today)).toBe(false);
  });
});

describe('resolveToday', () => {
  it('returns a valid client-supplied date', () => {
    expect(resolveToday('2026-01-31')).toBe('2026-01-31');
  });

  it('falls back to the server UTC date when no date is given', () => {
    expect(resolveToday(undefined)).toBe(todayUtc());
  });

  it('falls back to the server UTC date when the date is invalid', () => {
    expect(resolveToday('2026-02-30')).toBe(todayUtc());
  });
});
