// FR-012 / data-model "Toast": brief, non-blocking confirmations in one polite live region.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../src/components/Toast';

function Trigger({ message = 'Meeting created' }: { message?: string }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success(message)}>
      Fire {message}
    </button>
  );
}

function renderToasts(...messages: string[]) {
  return render(
    <ToastProvider>
      {messages.map((m) => (
        <Trigger key={m} message={m} />
      ))}
    </ToastProvider>,
  );
}

const fire = (message: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Fire ${message}` }));

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the message in a polite live region that is not a status role', () => {
    const { container } = renderToasts('Meeting created');
    fire('Meeting created');
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region).toHaveTextContent('Meeting created');
    // deletion.test.tsx relies on there being a single status role on the page.
    expect(region).not.toHaveAttribute('role', 'status');
  });

  it('auto-dismisses after 4 seconds', () => {
    renderToasts('Meeting created');
    fire('Meeting created');
    act(() => vi.advanceTimersByTime(3900));
    expect(screen.getByText('Meeting created')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Meeting created')).not.toBeInTheDocument();
  });

  it('pauses while hovered and resumes on leave', () => {
    renderToasts('Meeting created');
    fire('Meeting created');
    const toast = screen.getByText('Meeting created').closest('[data-toast]')!;
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText('Meeting created')).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(4100));
    expect(screen.queryByText('Meeting created')).not.toBeInTheDocument();
  });

  it('can be dismissed immediately', () => {
    renderToasts('Meeting created');
    fire('Meeting created');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Meeting created')).not.toBeInTheDocument();
  });

  it('shows at most 3, evicting the oldest', () => {
    renderToasts('One', 'Two', 'Three', 'Four');
    for (const m of ['One', 'Two', 'Three', 'Four']) fire(m);
    expect(screen.queryByText('One')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(3);
  });

  it('renders the message as text, never HTML', () => {
    renderToasts('<b>x</b>');
    fire('<b>x</b>');
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument();
  });

  it('is a harmless no-op without a provider', () => {
    render(<Trigger />);
    expect(() => fire('Meeting created')).not.toThrow();
  });
});
