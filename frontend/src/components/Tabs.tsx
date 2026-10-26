import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

interface Tab {
  label: string;
  content: ReactNode;
}

/** WAI-ARIA tabs: arrow keys move between tabs, only the selected tab is in the Tab order. */
export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (selected + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setSelected(next);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="tabs">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={`${baseId}-panel-${i}`}
            tabIndex={i === selected ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={onKeyDown}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.label}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== selected}
          tabIndex={0}
        >
          {i === selected && t.content}
        </div>
      ))}
    </div>
  );
}
