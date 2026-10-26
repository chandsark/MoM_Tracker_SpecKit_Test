import type {
  DeletionImpact,
  Meeting,
  MeetingCreate,
  MeetingSummary,
  MeetingUpdate,
  Page,
  Traceability,
} from '@mom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, localToday } from './client';

export type MeetingQuery = Record<string, string | undefined>;

export function useMeetings(query: MeetingQuery) {
  return useQuery({
    queryKey: ['meetings', 'list', query],
    queryFn: () => apiFetch<Page<MeetingSummary>>('/meetings', { query }),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ['meetings', id],
    queryFn: () => apiFetch<Meeting>(`/meetings/${id}`),
  });
}

export function useTraceability(id: string) {
  return useQuery({
    queryKey: ['meetings', id, 'traceability'],
    queryFn: () =>
      apiFetch<Traceability>(`/meetings/${id}/traceability`, { query: { today: localToday() } }),
  });
}

export function useDeletionImpact(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['meetings', id, 'deletion-impact'],
    queryFn: () => apiFetch<DeletionImpact>(`/meetings/${id}/deletion-impact`),
    enabled,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCreate) => apiFetch<Meeting>('/meetings', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}

export function useUpdateMeeting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingUpdate) =>
      apiFetch<Meeting>(`/meetings/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
}
