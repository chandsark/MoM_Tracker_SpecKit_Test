import type {
  ActionItem,
  ActionItemCreate,
  ActionItemDetail,
  ActionItemUpdate,
  Page,
} from '@mom/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch, localToday } from './client';

export type ActionItemQuery = Record<string, string | undefined>;

/** Action items appear in many views; refresh all of them after any change. */
export function invalidateWork(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['action-items'] }),
    qc.invalidateQueries({ queryKey: ['meetings'] }),
    qc.invalidateQueries({ queryKey: ['issues'] }),
    qc.invalidateQueries({ queryKey: ['history'] }),
  ]);
}

export function useActionItem(id: string) {
  return useQuery({
    queryKey: ['action-items', id],
    queryFn: () =>
      apiFetch<ActionItemDetail>(`/action-items/${id}`, { query: { today: localToday() } }),
  });
}

export function useActionItems(query: ActionItemQuery) {
  return useQuery({
    queryKey: ['action-items', 'list', query],
    queryFn: () =>
      apiFetch<Page<ActionItem>>('/action-items', { query: { today: localToday(), ...query } }),
  });
}

export function useCreateActionItem(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ActionItemCreate) =>
      apiFetch<ActionItemDetail>(`/meetings/${meetingId}/action-items`, {
        method: 'POST',
        body,
        query: { today: localToday() },
      }),
    onSuccess: () => invalidateWork(qc),
  });
}

export function useUpdateActionItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ActionItemUpdate) =>
      apiFetch<ActionItemDetail>(`/action-items/${id}`, {
        method: 'PATCH',
        body,
        query: { today: localToday() },
      }),
    onSuccess: () => invalidateWork(qc),
  });
}
