import { dateString, TERMINAL_ACTION_ITEM_STATUSES, type ActionItemStatus } from '@mom/shared';

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The client's local "today" when supplied and valid, otherwise the server's UTC date. */
export function resolveToday(param: string | undefined): string {
  if (param !== undefined && dateString.safeParse(param).success) return param;
  return todayUtc();
}

export function isOverdue(dueDate: string, status: string, today: string): boolean {
  return dueDate < today && !TERMINAL_ACTION_ITEM_STATUSES.includes(status as ActionItemStatus);
}
