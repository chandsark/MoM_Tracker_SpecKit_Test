import { DeleteQuery, IssueCreate, IssueFilters, IssueUpdate } from '@mom/shared';
import { Router } from 'express';
import { sendCsv } from '../lib/csv';
import { currentUser } from '../lib/serialize';
import { asyncHandler, parseQuery, validateBody } from '../middleware/validate';
import { exportIssuesCsv } from './csv';
import * as issues from './service';

export const issuesRouter = Router();

issuesRouter.get(
  '/issues',
  asyncHandler(async (req, res) => {
    res.json(await issues.listIssues(currentUser(req), parseQuery(IssueFilters, req)));
  }),
);

// Registered before /issues/:issueId so "export.csv" is not taken as an id.
issuesRouter.get(
  '/issues/export.csv',
  asyncHandler(async (req, res) => {
    sendCsv(res, 'issues', await exportIssuesCsv(currentUser(req), parseQuery(IssueFilters, req)));
  }),
);

issuesRouter.post(
  '/action-items/:actionItemId/issues',
  validateBody(IssueCreate),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await issues.createIssue(
          currentUser(req),
          req.params.actionItemId!,
          req.body as IssueCreate,
        ),
      );
  }),
);

issuesRouter.get(
  '/issues/:issueId',
  asyncHandler(async (req, res) => {
    res.json(await issues.getIssue(currentUser(req), req.params.issueId!));
  }),
);

issuesRouter.patch(
  '/issues/:issueId',
  validateBody(IssueUpdate),
  asyncHandler(async (req, res) => {
    res.json(
      await issues.updateIssue(currentUser(req), req.params.issueId!, req.body as IssueUpdate),
    );
  }),
);

issuesRouter.delete(
  '/issues/:issueId',
  asyncHandler(async (req, res) => {
    const { version } = parseQuery(DeleteQuery, req);
    await issues.deleteIssue(currentUser(req), req.params.issueId!, version);
    res.status(204).end();
  }),
);
