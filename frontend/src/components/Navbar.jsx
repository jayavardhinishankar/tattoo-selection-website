import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelection } from '../context/SelectionContext';
import { formatPrice } from '../utils/format';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { count, total } = useSelection();
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo" onClick={close}>
          Tattoo<span>Studio</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>
            Home
          </NavLink>
          <NavLink to="/gallery" onClick={close}>
            All Tattoos
          </NavLink>
          <NavLink to="/selection" className="nav-selection" onClick={close}>
            My Selection
            {count > 0 && (
              <span className="badge">
                {count} · {formatPrice(total)}
              </span>
            )}
          </NavLink>
          <NavLink to="/feedback" onClick={close}>
            Feedback
          </NavLink>
          <NavLink to="/lettering-designer" onClick={close}>
            Lettering Designer
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
