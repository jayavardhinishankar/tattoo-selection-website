import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { admin, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Spinner label="Checking session…" />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}
