import type { Pagination } from '@mom/shared';

export function toSkipTake({ page, pageSize }: Pagination): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function pageResult<T>(items: T[], total: number): { items: T[]; total: number } {
  return { items, total };
}
