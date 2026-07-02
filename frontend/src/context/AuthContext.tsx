import { useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../api/client';
import { AuthContext, type User } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  // Arranca cargando solo si hay un token que validar contra /auth/me
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    if (!token) return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [token, logout]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
