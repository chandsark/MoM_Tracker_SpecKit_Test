import type { ParticipantInput } from '@mom/shared';
import { useState } from 'react';
import { useUserSearch } from '../api/users';

interface Props {
  value: ParticipantInput[];
  /** Display names for registered users already in `value`, keyed by user id. */
  labels: Record<string, string>;
  onChange: (next: ParticipantInput[], newLabels?: Record<string, string>) => void;
  error?: string;
}

/** Choose registered users by search, or add external participants by name. */
export function ParticipantPicker({ value, labels, onChange, error }: Props) {
  const [query, setQuery] = useState('');
  const [external, setExternal] = useState('');
  const search = useUserSearch(query);
  const selectedIds = new Set(value.flatMap((p) => (p.userId ? [p.userId] : [])));
  const results = (search.data?.items ?? []).filter((u) => !selectedIds.has(u.id));
  const errorId = 'participants-error';

  function addExternal() {
    const name = external.trim();
    if (!name) return;
    onChange([...value, { externalName: name }]);
    setExternal('');
  }

  return (
    <fieldset className="field" aria-describedby={error ? errorId : undefined}>
      <legend>Participants</legend>
      {value.length === 0 ? (
        <p className="muted">No participants yet.</p>
      ) : (
        <ul aria-label="Selected participants" className="plain-list">
          {value.map((p, i) => {
            const name = p.userId
              ? (labels[p.userId] ?? 'Unknown user')
              : `${p.externalName} (external)`;
            return (
              <li key={p.userId ?? `ext-${i}-${p.externalName}`} className="row">
                <span>{name}</span>
                <button
                  type="button"
                  className="link"
                  aria-label={`Remove ${name}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <label htmlFor="participant-search">Find a registered user</label>
      <input
        id="participant-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && (
        <ul aria-label="Matching users" className="plain-list" aria-live="polite">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  onChange([...value, { userId: u.id }], { [u.id]: u.name });
                  setQuery('');
                }}
              >
                Add {u.name}
              </button>
            </li>
          ))}
          {search.isSuccess && results.length === 0 && (
            <li className="muted">No matching users.</li>
          )}
        </ul>
      )}

      <label htmlFor="participant-external">External participant name</label>
      <div className="row">
        <input
          id="participant-external"
          value={external}
          maxLength={100}
          onChange={(e) => setExternal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addExternal();
            }
          }}
        />
        <button type="button" className="secondary" onClick={addExternal}>
          Add external participant
        </button>
      </div>
      <p id={errorId} className="field-error" aria-live="polite">
        {error}
      </p>
    </fieldset>
  );
}
