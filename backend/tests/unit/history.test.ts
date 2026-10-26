import { describe, expect, it } from 'vitest';
import { diffFields } from '../../src/history';

describe('diffFields', () => {
  it('returns one entry per changed field with string values', () => {
    const before = { status: 'OPEN', dueDate: '2026-10-01', description: 'A' };
    const after = { status: 'IN_PROGRESS', dueDate: '2026-10-05', description: 'A' };
    expect(diffFields(before, after, ['status', 'dueDate', 'description'])).toEqual([
      { field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' },
      { field: 'dueDate', oldValue: '2026-10-01', newValue: '2026-10-05' },
    ]);
  });

  it('returns nothing when no field changed', () => {
    expect(diffFields({ a: 1 }, { a: 1 }, ['a'])).toEqual([]);
  });

  it('ignores fields missing from the update', () => {
    expect(diffFields({ a: 'x', b: 'y' }, { a: 'z' }, ['a', 'b'])).toEqual([
      { field: 'a', oldValue: 'x', newValue: 'z' },
    ]);
  });

  it('renders users as "Name (id)"', () => {
    const before = { assignee: { id: 'u1', name: 'Arjun' } };
    const after = { assignee: { id: 'u2', name: 'Mei' } };
    expect(diffFields(before, after, ['assignee'])).toEqual([
      { field: 'assignee', oldValue: 'Arjun (u1)', newValue: 'Mei (u2)' },
    ]);
  });

  it('renders lists as comma-separated values', () => {
    expect(diffFields({ p: ['A', 'B'] }, { p: ['A', 'C'] }, ['p'])).toEqual([
      { field: 'p', oldValue: 'A, B', newValue: 'A, C' },
    ]);
  });
});
