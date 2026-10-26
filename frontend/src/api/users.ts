import type { Page, UserRef } from '@mom/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => apiFetch<Page<UserRef>>('/users', { query: { q, pageSize: 10 } }),
    enabled: q.trim().length > 0,
  });
}

/** Every active user, for assignee pickers (v1 targets a single team of up to ~200 users). */
export function useAllUsers(enabled = true) {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiFetch<Page<UserRef>>('/users', { query: { pageSize: 200 } }),
    staleTime: 60_000,
    enabled,
  });
}
