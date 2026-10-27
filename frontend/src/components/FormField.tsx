import type { ReactNode } from 'react';

export interface FieldA11yProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface Props {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: (a11y: FieldA11yProps) => ReactNode;
}

/** Label + control + hint + error, with the control wired to both via aria-describedby. */
export function FormField({ label, id, error, hint, children }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      <p id={errorId} className="field-error" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
