import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken, refreshTokens, getAccessToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const applySession = useCallback((u, token) => {
    setAccessToken(token);
    setUser(u);
    connectSocket(token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best effort — the session is revoked server-side on rotation anyway.
    }
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const tokens = await refreshTokens();
        if (!cancelled) applySession(tokens.user, tokens.accessToken);
      } catch {
        // No valid refresh cookie — start anonymous.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    boot();

    const onExpired = () => setUser(null);
    const onRefreshed = (e) => setUser(e.detail);
    window.addEventListener('auth:expired', onExpired);
    window.addEventListener('auth:refreshed', onRefreshed);
    return () => {
      cancelled = true;
      window.removeEventListener('auth:expired', onExpired);
      window.removeEventListener('auth:refreshed', onRefreshed);
    };
  }, [applySession]);

  const loginWith = useCallback(
    (tokens) => {
      applySession(tokens.user, tokens.accessToken);
    },
    [applySession]
  );

  const value = {
    user,
    booting,
    isAuthenticated: Boolean(user),
    isVerified: Boolean(user?.verificationStatus?.emailVerified),
    isAdmin: user?.role === 'admin',
    loginWith,
    logout,
    setUser,
    refreshSession: async () => {
      if (!getAccessToken()) return null;
      const tokens = await refreshTokens();
      setUser(tokens.user);
      return tokens.user;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
