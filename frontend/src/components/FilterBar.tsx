import { useState } from 'react';
import { useSearchParams } from 'react-router';

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * One filter control. `name` is the API query parameter, so the URL, the list request and the
 * CSV export all use the same names (contracts/ui-routes.md).
 */
export type FilterField =
  | { kind: 'text' | 'date'; name: string; label: string }
  | { kind: 'select'; name: string; label: string; options: FilterOption[] }
  /** Checkbox group stored as a comma-separated list, e.g. status=OPEN,BLOCKED. */
  | { kind: 'multi'; name: string; label: string; options: FilterOption[] }
  /** Single checkbox stored as name=true. */
  | { kind: 'flag'; name: string; label: string }
  /** Set by links from elsewhere (e.g. an action item); shown as a removable chip. */
  | { kind: 'chip'; name: string; label: string; display?: string };

export type FilterValues = Record<string, string | undefined>;

const PAGE_SIZE = 50;

/** Filter state read from the URL query string. */
export function useUrlFilters(fields: FilterField[]) {
  const [urlParams, setUrlParams] = useSearchParams();
  // The router applies URL changes in a transition; until it does, show the new values so
  // controlled checkboxes and inputs do not briefly snap back.
  const [optimistic, setOptimistic] = useState<{ base: string; next: URLSearchParams } | null>(
    null,
  );
  const pending = optimistic?.base === urlParams.toString();
  // Once the URL has moved on, forget the overlay so Back to the old URL is not masked by it.
  if (optimistic && !pending) setOptimistic(null);
  const params = pending ? optimistic!.next : urlParams;

  function update(change: (next: URLSearchParams) => void, replace: boolean) {
    const next = new URLSearchParams(params);
    change(next);
    setOptimistic({ base: urlParams.toString(), next });
    setUrlParams(next, { replace });
  }

  const filters: FilterValues = {};
  for (const f of fields) filters[f.name] = params.get(f.name) || undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);

  function setFilter(name: string, value: string | undefined) {
    update((next) => {
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page'); // new filters start from the first page
    }, true);
  }

  function setPage(n: number) {
    update((next) => {
      if (n > 1) next.set('page', String(n));
      else next.delete('page');
    }, false);
  }

  return {
    filters,
    page,
    pageSize: PAGE_SIZE,
    /** Parameters for the list request: filters plus pagination. */
    listQuery: { ...filters, page: String(page), pageSize: String(PAGE_SIZE) },
    isFiltered: Object.values(filters).some(Boolean),
    setFilter,
    setPage,
    clear: () => update((next) => [...next.keys()].forEach((k) => next.delete(k)), true),
  };
}

type Props = { fields: FilterField[]; label: string } & Pick<
  ReturnType<typeof useUrlFilters>,
  'filters' | 'setFilter' | 'isFiltered' | 'clear'
>;

function toggle(
  list: string | undefined,
  value: string,
  options: FilterOption[],
): string | undefined {
  const selected = new Set(list?.split(',').filter(Boolean));
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  // Keep the options' order so the URL is stable regardless of click order.
  return (
    options
      .map((o) => o.value)
      .filter((v) => selected.has(v))
      .join(',') || undefined
  );
}

export function FilterBar({ fields, label, filters, setFilter, isFiltered, clear }: Props) {
  return (
    <form
      className="card mb-6 flex flex-wrap items-end gap-4"
      aria-label={label}
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      {fields.map((f) => {
        const value = filters[f.name];
        const id = `filter-${f.name}`;
        switch (f.kind) {
          case 'text':
          case 'date':
            return (
              <div
                className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-40"
                key={f.name}
              >
                <label htmlFor={id} className="field-label">
                  {f.label}
                </label>
                <input
                  id={id}
                  type={f.kind === 'date' ? 'date' : 'search'}
                  value={value ?? ''}
                  onChange={(e) => setFilter(f.name, e.target.value)}
                />
              </div>
            );
          case 'select':
            return (
              <div
                className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-40"
                key={f.name}
              >
                <label htmlFor={id} className="field-label">
                  {f.label}
                </label>
                <select
                  id={id}
                  value={value ?? ''}
                  onChange={(e) => setFilter(f.name, e.target.value)}
                >
                  <option value="">Any</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          case 'multi': {
            const selected = new Set(value?.split(','));
            return (
              <fieldset className="m-0 min-w-0 border-0 p-0" key={f.name}>
                <legend className="field-label mb-1.5 p-0">{f.label}</legend>
                <div className="flex flex-wrap gap-x-4">
                  {f.options.map((o) => (
                    <label
                      key={o.value}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(o.value)}
                        onChange={() => setFilter(f.name, toggle(value, o.value, f.options))}
                      />{' '}
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }
          case 'flag':
            return (
              <div key={f.name}>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={value === 'true'}
                    onChange={(e) => setFilter(f.name, e.target.checked ? 'true' : undefined)}
                  />{' '}
                  {f.label}
                </label>
              </div>
            );
          case 'chip':
            if (!value) return null;
            return (
              <div className="flex items-center gap-1" key={f.name}>
                <span className="badge badge-info">
                  {f.label}: {f.display ?? value}
                </span>
                <button
                  type="button"
                  className="btn-link min-w-11 px-2 text-sm"
                  aria-label={`Remove ${f.label.toLowerCase()} filter`}
                  onClick={() => setFilter(f.name, undefined)}
                >
                  Remove
                </button>
              </div>
            );
        }
      })}
      {isFiltered && (
        <div>
          <button type="button" className="btn btn-secondary" onClick={clear}>
            Clear filters
          </button>
        </div>
      )}
    </form>
  );
}

/** "12 action items" plus Previous / Next when results span several pages. */
export function ResultsSummary({
  total,
  noun,
  page,
  pageSize,
  setPage,
}: {
  total: number;
  noun: [singular: string, plural: string];
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p role="status" data-testid="result-count" className="m-0 text-sm text-muted">
        {total} {total === 1 ? noun[0] : noun[1]}
      </p>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
