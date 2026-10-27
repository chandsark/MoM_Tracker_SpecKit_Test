import { zodResolver } from '@hookform/resolvers/zod';
import { ActionItemCreate } from '@mom/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAllUsers } from '../api/users';
import { applyServerErrors, fieldError } from '../lib/forms';
import { FormField } from './FormField';

interface Props {
  onSubmit: (values: ActionItemCreate) => Promise<unknown>;
}

const EMPTY = { description: '', assigneeId: '', startDate: '', dueDate: '' };

export function ActionItemForm({ onSubmit }: Props) {
  const users = useAllUsers();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActionItemCreate>({ resolver: zodResolver(ActionItemCreate), defaultValues: EMPTY });

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
    <form onSubmit={submit} noValidate className="card" aria-label="New action item">
      {formError && (
        <p
          className="mb-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {formError}
        </p>
      )}
      <FormField
        label="Description"
        id="item-description"
        hint="Up to 2000 characters."
        error={fieldError(errors, 'description')}
      >
        {(a11y) => <textarea maxLength={2000} {...a11y} {...register('description')} />}
      </FormField>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <FormField label="Assignee" id="item-assignee" error={fieldError(errors, 'assigneeId')}>
          {(a11y) => (
            <select {...a11y} {...register('assigneeId')}>
              <option value="">Choose a person</option>
              {users.data?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Start date" id="item-start" error={fieldError(errors, 'startDate')}>
          {(a11y) => <input type="date" {...a11y} {...register('startDate')} />}
        </FormField>
        <FormField label="Due date" id="item-due" error={fieldError(errors, 'dueDate')}>
          {(a11y) => <input type="date" {...a11y} {...register('dueDate')} />}
        </FormField>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          Add action item
        </button>
      </div>
    </form>
  );
}
