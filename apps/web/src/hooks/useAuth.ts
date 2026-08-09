import { useState, useEffect, useCallback } from 'react';
import { fetchMe, logout, type Me } from '../api';

export function useAuth() {
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    // Check url search params on mount for authorization errors
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('authError');
    if (authError) {
      window.history.replaceState({}, '', '/');
      return authError;
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((profile) => {
        if (active) setMe(profile);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMe(null);
  }, []);

  const clearAuth = useCallback((errMessage?: string) => {
    setMe(null);
    if (errMessage) setError(errMessage);
  }, []);

  return {
    me,
    authChecked,
    error,
    setError,
    clearAuth,
    handleLogout,
  };
}
