export function EmptyState({ message, onClear }: { message: string; onClear?: () => void }) {
  return (
    <div className="empty-state card" role="status">
      <p>{message}</p>
      {onClear && (
        <button type="button" className="secondary" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
