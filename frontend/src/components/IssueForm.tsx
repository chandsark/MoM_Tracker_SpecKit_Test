import { zodResolver } from '@hookform/resolvers/zod';
import { ISSUE_SEVERITIES, ISSUE_SEVERITY_LABELS, IssueCreate } from '@mom/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors, fieldError } from '../lib/forms';
import { FormField } from './FormField';

const EMPTY = { title: '', description: '', severity: '' as unknown as IssueCreate['severity'] };

export function IssueForm({ onSubmit }: { onSubmit: (values: IssueCreate) => Promise<unknown> }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueCreate>({ resolver: zodResolver(IssueCreate), defaultValues: EMPTY });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(EMPTY);
    } catch (err) {
      setFormError(applyServerErrors(err, setError));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="card" aria-label="Raise an issue">
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <FormField
        label="Title"
        id="issue-title"
        hint="Up to 200 characters."
        error={fieldError(errors, 'title')}
      >
        {(a11y) => <input maxLength={200} {...a11y} {...register('title')} />}
      </FormField>
      <FormField
        label="Description"
        id="issue-description"
        error={fieldError(errors, 'description')}
      >
        {(a11y) => <textarea maxLength={2000} {...a11y} {...register('description')} />}
      </FormField>
      <FormField label="Severity" id="issue-severity" error={fieldError(errors, 'severity')}>
        {(a11y) => (
          <select {...a11y} {...register('severity')}>
            <option value="">Select…</option>
            {ISSUE_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {ISSUE_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <button type="submit" disabled={isSubmitting}>
        Raise issue
      </button>
    </form>
  );
}
