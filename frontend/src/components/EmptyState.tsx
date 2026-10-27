import { Link } from 'react-router';
import { AlertIcon } from './icons';

interface Props {
  message: string;
  onClear?: () => void;
  /** The next step when there is nothing yet, e.g. "New meeting". */
  action?: { label: string; to: string };
}

export function EmptyState({ message, onClear, action }: Props) {
  return (
    <div
      className="empty-state card flex flex-col items-center gap-3 py-10 text-center"
      role="status"
    >
      <span className="rounded-full bg-neutral-bg p-3 text-muted">
        <AlertIcon className="size-6" />
      </span>
      <p className="m-0 text-muted">{message}</p>
      {action && (
        <Link to={action.to} className="btn btn-primary">
          {action.label}
        </Link>
      )}
      {onClear && (
        <button type="button" className="btn btn-secondary" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
