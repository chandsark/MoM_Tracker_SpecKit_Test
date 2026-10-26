import { CommentCreate, type Comment } from '@mom/shared';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { formatDateTime } from '../lib/format';

export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return <p className="muted">No comments yet.</p>;
  return (
    <ul aria-label="Comments" className="plain-list">
      {comments.map((c) => (
        <li key={c.id}>
          <strong>{c.author.name}</strong>{' '}
          <time className="muted" dateTime={c.createdAt}>
            {formatDateTime(c.createdAt)}
          </time>
          <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{c.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function CommentForm({ onSubmit }: { onSubmit: (body: string) => Promise<unknown> }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = CommentCreate.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(parsed.data.body);
      setBody('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post the comment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="comment-body">Add a comment</label>
        <textarea
          id="comment-body"
          maxLength={1000}
          value={body}
          aria-invalid={Boolean(error)}
          aria-describedby="comment-body-hint comment-body-error"
          onChange={(e) => setBody(e.target.value)}
        />
        <p id="comment-body-hint" className="field-hint">
          {body.length}/1000 characters
        </p>
        <p id="comment-body-error" className="field-error" aria-live="polite">
          {error}
        </p>
      </div>
      <button type="submit" disabled={busy}>
        Post comment
      </button>
    </form>
  );
}
