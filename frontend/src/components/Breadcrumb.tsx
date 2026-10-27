import { Link } from 'react-router';

interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0 text-sm text-muted">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={`${item.label}-${i}`}
              // The separator is CSS so it never becomes part of the crumb's text.
              className="inline-flex items-center gap-1 [&+li]:before:content-['›']"
            >
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="font-medium text-text">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
