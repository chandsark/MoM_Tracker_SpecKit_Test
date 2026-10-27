import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertIcon, CheckIcon, CloseIcon } from './icons';

type Kind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const MAX_VISIBLE = 3;
const DISMISS_AFTER_MS = 4000;

const noop = () => {};
const ToastContext = createContext<ToastApi>({ success: noop, error: noop, info: noop });

/** Brief success/error confirmations (FR-012). Outside a provider the API is a no-op. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DISMISS_AFTER_MS);

  useEffect(() => {
    if (paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused, item.id, onDismiss]);

  return (
    <div
      data-toast
      className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3 pr-1 shadow-lg sm:p-3 sm:pr-1 motion-safe:animate-toast-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {item.kind === 'error' ? (
        <AlertIcon className="mt-0.5 size-5 text-danger" />
      ) : (
        <CheckIcon className="mt-0.5 size-5 text-success" />
      )}
      <p className="m-0 flex-1 self-center text-sm">{item.message}</p>
      <button
        type="button"
        className="btn-link min-w-11 justify-center text-muted no-underline"
        onClick={() => onDismiss(item.id)}
      >
        <CloseIcon className="size-4" />
        <span className="sr-only">Dismiss notification</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const push = (kind: Kind) => (message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, kind, message }].slice(-MAX_VISIBLE));
    };
    return { success: push('success'), error: push('error'), info: push('info') };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* No role="status": pages already use that role and tests expect it to be unique. */}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
