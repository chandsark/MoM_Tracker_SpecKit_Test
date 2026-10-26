import { TERMINAL_ACTION_ITEM_STATUSES, type ActionItemStatus } from '@mom/shared';

/**
 * data-model.md "State transitions": non-terminal statuses may move anywhere; DONE and CANCELLED
 * can only be reopened to OPEN or IN_PROGRESS.
 */
export function canTransitionActionItem(from: ActionItemStatus, to: ActionItemStatus): boolean {
  if (from === to) return true;
  if (TERMINAL_ACTION_ITEM_STATUSES.includes(from)) return to === 'OPEN' || to === 'IN_PROGRESS';
  return true;
}
