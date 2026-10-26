import type { IssueStatus } from '@mom/shared';

/** OPEN ⇄ IN_PROGRESS → RESOLVED, OPEN → RESOLVED, and RESOLVED reopens only to OPEN. */
export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  if (from === to) return true;
  if (from === 'RESOLVED') return to === 'OPEN';
  return true;
}
