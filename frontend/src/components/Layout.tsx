import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { CloseIcon, MenuIcon } from './icons';

const NAV = [
  { to: '/', label: 'My work', end: true },
  { to: '/meetings', label: 'Meetings' },
  { to: '/action-items', label: 'Action items' },
  { to: '/issues', label: 'Issues' },
  { to: '/deleted', label: 'Deleted items' },
];

const NAV_LINK =
  'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-muted no-underline hover:text-text aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary';

const MOBILE_LINK =
  'flex min-h-11 items-center rounded-lg px-3 font-medium text-text no-underline hover:bg-primary-soft aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  // The menu belongs to the page it was opened on, so any navigation closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setOpenOn(null);
      menuButton.current?.focus();
    }
    const wide = window.matchMedia?.('(min-width: 768px)');
    const onResize = () => wide?.matches && setOpenOn(null);
    document.addEventListener('keydown', onKeyDown);
    wide?.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      wide?.removeEventListener('change', onResize);
    };
  }, [open]);

  async function onSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <a
        className="btn btn-secondary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        href="#main"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-x-4 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center text-lg font-bold tracking-tight text-text no-underline"
          >
            MoM Tracker
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={NAV_LINK}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-muted">{user?.name}</span>
            <button type="button" className="btn btn-secondary" onClick={onSignOut}>
              Sign out
            </button>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="btn btn-secondary min-w-11 px-3 md:hidden"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
        {open && (
          <nav
            id={panelId}
            aria-label="Main"
            className="border-t border-border bg-surface px-4 py-3 shadow-lg md:hidden"
          >
            <ul className="m-0 list-none space-y-1 p-0">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={MOBILE_LINK}
                    onClick={() => setOpenOn(null)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-sm text-muted">{user?.name}</span>
              <button type="button" className="btn btn-secondary" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>
      <main
        id="main"
        className="mx-auto max-w-6xl px-4 py-6 focus:outline-none sm:px-6 sm:py-8"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </>
  );
}
