import type { EntityPathSegment, HistoryEntry } from '@mom/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export function useHistory(entityType: EntityPathSegment, id: string) {
  return useQuery({
    queryKey: ['history', entityType, id],
    queryFn: () => apiFetch<HistoryEntry[]>(`/history/${entityType}/${id}`),
  });
}
