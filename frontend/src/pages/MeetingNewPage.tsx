import { useNavigate } from 'react-router';
import { useCreateMeeting } from '../api/meetings';
import { MeetingForm } from '../components/MeetingForm';
import { useToast } from '../components/Toast';

export function MeetingNewPage() {
  const create = useCreateMeeting();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <>
      <h1 className="mb-6">New meeting</h1>
      <MeetingForm
        submitLabel="Save meeting"
        onSubmit={async (values) => {
          const meeting = await create.mutateAsync(values);
          toast.success('Meeting created');
          navigate(`/meetings/${meeting.id}`);
        }}
      />
    </>
  );
}
