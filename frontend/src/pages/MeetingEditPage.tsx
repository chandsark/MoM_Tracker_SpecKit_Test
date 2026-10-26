import type { Meeting } from '@mom/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/client';
import { useMeeting, useUpdateMeeting } from '../api/meetings';
import { Breadcrumb } from '../components/Breadcrumb';
import { ConflictBanner } from '../components/ConflictBanner';
import { ErrorMessage } from '../components/ErrorMessage';
import { MeetingForm } from '../components/MeetingForm';
import { formatDate } from '../lib/format';

export function MeetingEditPage() {
  const id = useParams().id!;
  const meeting = useMeeting(id);
  const update = useUpdateMeeting(id);
  const navigate = useNavigate();
  const [conflict, setConflict] = useState<Meeting | null>(null);

  if (meeting.isPending) return <p role="status">Loading…</p>;
  if (meeting.error) return <ErrorMessage error={meeting.error} />;
  const m = meeting.data;

  return (
    <>
      <Breadcrumb items={[{ label: m.description, to: `/meetings/${id}` }, { label: 'Edit' }]} />
      <h1>Edit meeting</h1>
      {!m.permissions.canEdit ? (
        <p>
          Only the organizer can edit this meeting.{' '}
          <Link to={`/meetings/${id}`}>Back to the meeting</Link>
        </p>
      ) : (
        <>
          {conflict && (
            <ConflictBanner
              onReload={async () => {
                await meeting.refetch();
                setConflict(null);
              }}
            >
              <p>
                Latest: “{conflict.description}” on {formatDate(conflict.meetingDate)} with{' '}
                {conflict.participantCount} participants.
              </p>
            </ConflictBanner>
          )}
          <MeetingForm
            key={m.version}
            initial={m}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              try {
                await update.mutateAsync({ version: m.version, ...values });
                navigate(`/meetings/${id}`);
              } catch (err) {
                if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
                  setConflict(err.details?.current as Meeting);
                  return;
                }
                throw err;
              }
            }}
          />
        </>
      )}
    </>
  );
}
