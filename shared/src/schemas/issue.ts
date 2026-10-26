import { z } from 'zod';
import { IssueSeverity, IssueStatus } from '../enums';
import { requiredText, version } from './common';

export const IssueCreate = z.strictObject({
  title: requiredText(200),
  description: requiredText(2000),
  severity: IssueSeverity,
});
export type IssueCreate = z.infer<typeof IssueCreate>;

export const IssueUpdate = z.strictObject({
  version,
  title: requiredText(200).optional(),
  description: requiredText(2000).optional(),
  severity: IssueSeverity.optional(),
  status: IssueStatus.optional(),
});
export type IssueUpdate = z.infer<typeof IssueUpdate>;
