import type { ErrorCode } from '@mom/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level messages from a VALIDATION_ERROR, keyed by field path. */
  get fieldErrors(): Record<string, string[]> {
    return (this.details?.fields as Record<string, string[]> | undefined) ?? {};
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export function toQueryString(query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const method = opts.method ?? 'GET';
  const res = await fetch(`/api${path}${toQueryString(opts.query)}`, {
    method,
    credentials: 'include',
    headers: {
      'X-Requested-With': 'fetch',
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = (
      data as { error?: { code: ErrorCode; message: string; details?: Record<string, unknown> } }
    )?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'INTERNAL',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.details,
    );
  }
  return data as T;
}

/** The user's local calendar date, sent so "overdue" matches what they see on their clock. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
