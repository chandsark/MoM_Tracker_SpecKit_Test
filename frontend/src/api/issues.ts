import type { Issue, IssueCreate, IssueUpdate, Page } from '@mom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateWork } from './actionItems';
import { apiFetch } from './client';

export type IssueQuery = Record<string, string | undefined>;

export function useIssue(id: string) {
  return useQuery({ queryKey: ['issues', id], queryFn: () => apiFetch<Issue>(`/issues/${id}`) });
}

export function useIssues(query: IssueQuery) {
  return useQuery({
    queryKey: ['issues', 'list', query],
    queryFn: () => apiFetch<Page<Issue>>('/issues', { query }),
  });
}

export function useCreateIssue(actionItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssueCreate) =>
      apiFetch<Issue>(`/action-items/${actionItemId}/issues`, { method: 'POST', body }),
    onSuccess: () => invalidateWork(qc),
  });
}

export function useUpdateIssue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IssueUpdate) => apiFetch<Issue>(`/issues/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidateWork(qc),
  });
}
