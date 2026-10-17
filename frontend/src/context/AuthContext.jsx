import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  // Ask the server whether the httpOnly cookie is still a valid session.
  useEffect(() => {
    let active = true;
    adminApi
      .me()
      .then((a) => active && setAdmin(a))
      .catch(() => active && setAdmin(null))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setAdmin(null);
    window.addEventListener('admin-session-expired', onExpired);
    return () => window.removeEventListener('admin-session-expired', onExpired);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const a = await adminApi.login(identifier, password);
    setAdmin(a);
    return a;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  return <AuthContext.Provider value={{ admin, checking, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
