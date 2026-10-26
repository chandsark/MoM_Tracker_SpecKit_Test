import { useNavigate } from 'react-router';
import { useCreateMeeting } from '../api/meetings';
import { MeetingForm } from '../components/MeetingForm';

export function MeetingNewPage() {
  const create = useCreateMeeting();
  const navigate = useNavigate();
  return (
    <>
      <h1>New meeting</h1>
      <MeetingForm
        submitLabel="Save meeting"
        onSubmit={async (values) => {
          const meeting = await create.mutateAsync(values);
          navigate(`/meetings/${meeting.id}`);
        }}
      />
    </>
  );
}
