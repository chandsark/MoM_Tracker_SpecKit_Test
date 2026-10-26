import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'My work', end: true },
  { to: '/meetings', label: 'Meetings' },
  { to: '/action-items', label: 'Action items' },
  { to: '/issues', label: 'Issues' },
  { to: '/deleted', label: 'Deleted items' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-title">
            MoM Tracker
          </Link>
          <nav aria-label="Main" className="app-nav">
            <ul>
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="muted">{user?.name}</span>
            <button type="button" className="secondary" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
