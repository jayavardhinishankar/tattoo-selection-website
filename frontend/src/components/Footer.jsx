import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="logo">
            Tattoo<span>Studio</span>
          </div>
          <p className="muted">Prices shown are indicative. Final cost is confirmed by the studio.</p>
        </div>
        <div className="footer-links">
          <Link to="/gallery">Gallery</Link>
          <Link to="/selection">My Selection</Link>
          <Link to="/admin/login">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
