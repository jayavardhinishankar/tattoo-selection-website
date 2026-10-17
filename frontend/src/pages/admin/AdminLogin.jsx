import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import { Notice } from '../../components/StateMessage';

export default function AdminLogin() {
  const { admin, checking, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!checking && admin) return <Navigate to="/admin" replace />;

  const validate = () => {
    const e = {};
    if (!identifier.trim()) e.identifier = 'Please enter your email or username';
    if (!password) e.password = 'Please enter your password';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setServerError(
        err.response?.status === 401 ? 'Invalid email/username or password.' : errorMessage(err, 'Login failed. Please try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <Link to="/" className="logo">
          Tattoo<span>Studio</span>
        </Link>
        <h1>Admin Login</h1>
        <p className="muted">Sign in to manage tattoos, categories and prices.</p>

        <Notice type="error">{serverError}</Notice>

        <label className="field">
          <span>Email or username</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
            aria-invalid={!!errors.identifier}
          />
          {errors.identifier && <small className="field-error">{errors.identifier}</small>}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
          />
          {errors.password && <small className="field-error">{errors.password}</small>}
        </label>

        <button className="btn btn-light btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Login'}
        </button>
        <Link to="/" className="muted small center-link">
          ← Back to website
        </Link>
      </form>
    </div>
  );
}
