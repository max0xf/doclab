import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/authApi';
import { AuthState } from '../types';

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  // Check existing session on mount
  useEffect(() => {
    authApi
      .me()
      .then(user => setState({ isAuthenticated: true, user, isLoading: false }))
      .catch(() => setState({ isAuthenticated: false, user: null, isLoading: false }));
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    setState({ isAuthenticated: true, user: response.user, isLoading: false });
  };

  const logout = async () => {
    await authApi.logout();
    setState({ isAuthenticated: false, user: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return null;
  }
  return <>{children}</>;
}
