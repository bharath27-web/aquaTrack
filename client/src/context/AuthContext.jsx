import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('aquatrack_token');
    const storedUser = localStorage.getItem('aquatrack_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token with backend
      authAPI.me().then((res) => {
        if (res.success) {
          setUser(res.user);
          localStorage.setItem('aquatrack_user', JSON.stringify(res.user));
        }
      }).catch(() => {
        localStorage.removeItem('aquatrack_token');
        localStorage.removeItem('aquatrack_user');
        setToken(null);
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role) => {
    try {
      const res = await authAPI.login({ email, password, role });
      if (res.success) {
        localStorage.setItem('aquatrack_token', res.token);
        localStorage.setItem('aquatrack_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
        return { success: true, role: res.user.role };
      }
    } catch (err) {
      const msg = err.message || 'Email or password is incorrect.';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (userData) => {
    try {
      const res = await authAPI.register(userData);
      if (res.success) {
        localStorage.setItem('aquatrack_token', res.token);
        localStorage.setItem('aquatrack_user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        toast.success(`Welcome to AquaTrack, ${res.user.name.split(' ')[0]}!`);
        return { success: true, role: res.user.role };
      }
    } catch (err) {
      const msg = err.message || 'Registration failed';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    localStorage.removeItem('aquatrack_token');
    localStorage.removeItem('aquatrack_user');
    setToken(null);
    setUser(null);
    toast.success('Signed out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('aquatrack_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
