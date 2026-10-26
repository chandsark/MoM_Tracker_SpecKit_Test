import { describe, expect, it } from 'vitest';
import { canTransitionIssue } from '../../src/issues/transitions';

describe('canTransitionIssue', () => {
  it.each([
    ['OPEN', 'OPEN', true],
    ['OPEN', 'IN_PROGRESS', true],
    ['OPEN', 'RESOLVED', true],
    ['IN_PROGRESS', 'OPEN', true],
    ['IN_PROGRESS', 'IN_PROGRESS', true],
    ['IN_PROGRESS', 'RESOLVED', true],
    ['RESOLVED', 'OPEN', true],
    ['RESOLVED', 'RESOLVED', true],
    ['RESOLVED', 'IN_PROGRESS', false],
  ] as const)('%s → %s is %s', (from, to, allowed) => {
    expect(canTransitionIssue(from, to)).toBe(allowed);
  });
});
