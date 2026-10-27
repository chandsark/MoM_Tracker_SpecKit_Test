/** Placeholder rows while data loads (FR-011). The status text must start with "Loading". */
export function LoadingSkeleton({
  rows = 3,
  label = 'Loading…',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          data-skeleton
          aria-hidden="true"
          className="h-12 rounded-lg bg-neutral-bg motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}
