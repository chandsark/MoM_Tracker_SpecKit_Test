import type { Comment } from '@mom/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export function useAddComment(actionItemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<Comment>(`/action-items/${actionItemId}/comments`, {
        method: 'POST',
        body: { body },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action-items', actionItemId] }),
  });
}
