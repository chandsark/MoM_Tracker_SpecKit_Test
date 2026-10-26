import type { EntityType, HistoryAction } from '@mom/shared';
import type { Tx } from '../db';

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

function display(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((v) => display(v) ?? '').join(', ');
  if (typeof value === 'object' && 'id' in value && 'name' in value) {
    const { id, name } = value as { id: string; name: string };
    return `${name} (${id})`;
  }
  return String(value);
}

/** One change per field whose display value differs; fields absent from `after` are unchanged. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of fields) {
    if (!(field in after) || after[field] === undefined) continue;
    const oldValue = display(before[field]);
    const newValue = display(after[field]);
    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }
  return changes;
}

export async function writeHistory(
  tx: Tx,
  entry: {
    entityType: EntityType;
    entityId: string;
    action: HistoryAction;
    actorId: string;
    changes?: FieldChange[];
  },
): Promise<void> {
  const base = {
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
  };
  if (entry.changes && entry.changes.length > 0) {
    await tx.changeHistory.createMany({ data: entry.changes.map((c) => ({ ...base, ...c })) });
  } else if (!entry.changes) {
    await tx.changeHistory.create({ data: base });
  }
}
