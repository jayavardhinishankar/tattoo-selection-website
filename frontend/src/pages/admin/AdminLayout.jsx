import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard Overview', end: true },
  { to: '/admin/categories', label: 'Manage Tattoo Categories' },
  { to: '/admin/tattoos', label: 'Manage Tattoos', end: true },
  { to: '/admin/tattoos/new', label: 'Add New Tattoo' },
  { to: '/admin/prices', label: 'Manage Prices' },
  { to: '/admin/feedback', label: 'Customer Feedback' },
  { to: '/admin/lettering-requests', label: 'Letter Tattoo Requests' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button className="nav-toggle" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          <span />
          <span />
          <span />
        </button>
        <span className="logo">
          Tattoo<span>Studio</span> <small className="muted">Admin</small>
        </span>
      </header>

      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="logo desktop-only">
          Tattoo<span>Studio</span>
        </div>
        <p className="muted small admin-user">Signed in as {admin?.username}</p>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
          <a href="/" target="_blank" rel="noreferrer">
            View Website ↗
          </a>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
