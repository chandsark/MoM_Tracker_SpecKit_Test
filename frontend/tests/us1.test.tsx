import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionItemForm } from '../src/components/ActionItemForm';
import { CommentList } from '../src/components/CommentList';
import { MeetingForm } from '../src/components/MeetingForm';
import { mockFetch, renderWithProviders, signedInUser } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

const users = {
  items: [
    { id: 'u-arjun', name: 'Arjun', active: true },
    { id: 'u-mei', name: 'Mei', active: true },
  ],
  total: 2,
};

function baseMocks() {
  return mockFetch({
    'GET /api/auth/me': () => ({ status: 200, body: signedInUser }),
    'GET /api/users': () => ({ status: 200, body: users }),
  });
}

describe('MeetingForm', () => {
  it('requires a description, a date and at least one participant', async () => {
    baseMocks();
    const onSubmit = vi.fn();
    renderWithProviders(<MeetingForm submitLabel="Save meeting" onSubmit={onSubmit} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save meeting' }));
    expect(await screen.findByText('Add at least one participant')).toBeInTheDocument();
    expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Use the format YYYY-MM-DD')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with a registered user and an external participant', async () => {
    baseMocks();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<MeetingForm submitLabel="Save meeting" onSubmit={onSubmit} />);
    await userEvent.type(await screen.findByLabelText('Description'), 'Sprint planning');
    fireEvent.change(screen.getByLabelText('Meeting date'), { target: { value: '2026-10-20' } });

    await userEvent.type(screen.getByLabelText('Find a registered user'), 'Arj');
    await userEvent.click(await screen.findByRole('button', { name: 'Add Arjun' }));

    await userEvent.type(screen.getByLabelText('External participant name'), 'Vendor Rep');
    await userEvent.click(screen.getByRole('button', { name: 'Add external participant' }));

    const list = screen.getByRole('list', { name: 'Selected participants' });
    expect(within(list).getByText('Arjun')).toBeInTheDocument();
    expect(within(list).getByText('Vendor Rep (external)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save meeting' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: 'Sprint planning',
        meetingDate: '2026-10-20',
        participants: [{ userId: 'u-arjun' }, { externalName: 'Vendor Rep' }],
      }),
    );
  });
});

describe('ActionItemForm', () => {
  it('blocks submit when the due date is before the start date', async () => {
    baseMocks();
    const onSubmit = vi.fn();
    renderWithProviders(<ActionItemForm onSubmit={onSubmit} />);
    await userEvent.type(await screen.findByLabelText('Description'), 'Prepare report');
    await screen.findByRole('option', { name: 'Arjun' });
    await userEvent.selectOptions(screen.getByLabelText('Assignee'), 'u-arjun');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-20' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-19' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add action item' }));

    const due = screen.getByLabelText('Due date');
    await waitFor(() => expect(due).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByText('Due date must be on or after the start date')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid values', async () => {
    baseMocks();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ActionItemForm onSubmit={onSubmit} />);
    await userEvent.type(await screen.findByLabelText('Description'), 'Prepare report');
    await screen.findByRole('option', { name: 'Mei' });
    await userEvent.selectOptions(screen.getByLabelText('Assignee'), 'u-mei');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-20' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-20' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add action item' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: 'Prepare report',
        assigneeId: 'u-mei',
        startDate: '2026-10-20',
        dueDate: '2026-10-20',
      }),
    );
  });
});

describe('CommentList', () => {
  it('renders author and time, oldest first', () => {
    renderWithProviders(
      <CommentList
        comments={[
          {
            id: 'c1',
            author: { id: 'a', name: 'Olivia', active: true },
            body: 'First',
            createdAt: '2026-10-20T09:00:00.000Z',
          },
          {
            id: 'c2',
            author: { id: 'b', name: 'Arjun', active: true },
            body: 'Second',
            createdAt: '2026-10-21T09:00:00.000Z',
          },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Olivia');
    expect(items[0]).toHaveTextContent('First');
    expect(items[1]).toHaveTextContent('Arjun');
    expect(items[0]!.querySelector('time')).toHaveAttribute('dateTime', '2026-10-20T09:00:00.000Z');
  });
});
