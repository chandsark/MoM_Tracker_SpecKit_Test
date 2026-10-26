import { zodResolver } from '@hookform/resolvers/zod';
import { MeetingCreate, type Participant } from '@mom/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { applyServerErrors, fieldError } from '../lib/forms';
import { FormField } from './FormField';
import { ParticipantPicker } from './ParticipantPicker';

interface Props {
  initial?: { description: string; meetingDate: string; participants: Participant[] };
  submitLabel: string;
  onSubmit: (values: MeetingCreate) => Promise<unknown>;
}

export function MeetingForm({ initial, submitLabel, onSubmit }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.participants ?? []).flatMap((p) => (p.user ? [[p.user.id, p.user.name]] : [])),
    ),
  );
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MeetingCreate>({
    resolver: zodResolver(MeetingCreate),
    defaultValues: {
      description: initial?.description ?? '',
      meetingDate: initial?.meetingDate ?? '',
      participants: (initial?.participants ?? []).map((p) =>
        p.user ? { userId: p.user.id } : { externalName: p.externalName ?? '' },
      ),
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(applyServerErrors(err, setError));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="card">
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <FormField
        label="Description"
        id="meeting-description"
        hint="A brief summary, up to 2000 characters."
        error={fieldError(errors, 'description')}
      >
        {(a11y) => <textarea maxLength={2000} {...a11y} {...register('description')} />}
      </FormField>
      <FormField label="Meeting date" id="meeting-date" error={fieldError(errors, 'meetingDate')}>
        {(a11y) => <input type="date" {...a11y} {...register('meetingDate')} />}
      </FormField>
      <Controller
        control={control}
        name="participants"
        render={({ field }) => (
          <ParticipantPicker
            value={field.value}
            labels={labels}
            error={fieldError(errors, 'participants')}
            onChange={(next, newLabels) => {
              if (newLabels) setLabels((l) => ({ ...l, ...newLabels }));
              field.onChange(next);
            }}
          />
        )}
      />
      <button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </button>
    </form>
  );
}
