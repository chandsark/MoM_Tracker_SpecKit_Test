import type { DeletedRecord, EntityPathSegment } from '@mom/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateWork } from './actionItems';
import { apiFetch } from './client';

const COLLECTION: Record<EntityPathSegment, string> = {
  meeting: 'meetings',
  'action-item': 'action-items',
  issue: 'issues',
};

/** Soft-deletes the record at the version the user confirmed. */
export function useDeleteRecord(entityType: EntityPathSegment, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) =>
      apiFetch<undefined>(`/${COLLECTION[entityType]}/${id}`, {
        method: 'DELETE',
        query: { version },
      }),
    // Not awaited: the caller navigates away first, so the deleted record is not refetched into a 404.
    onSuccess: () => {
      void invalidateWork(qc);
      void qc.invalidateQueries({ queryKey: ['deleted'] });
    },
  });
}

export function useDeletedRecords() {
  return useQuery({ queryKey: ['deleted'], queryFn: () => apiFetch<DeletedRecord[]>('/deleted') });
}

export function useRestore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: Pick<DeletedRecord, 'entityType' | 'id'>) =>
      apiFetch<undefined>(`/deleted/${r.entityType}/${r.id}/restore`, { method: 'POST' }),
    onSuccess: () =>
      Promise.all([invalidateWork(qc), qc.invalidateQueries({ queryKey: ['deleted'] })]),
  });
}
