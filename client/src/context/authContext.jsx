/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Load user profile from localStorage immediately for fast, crash-free boots
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setLoading(false); // Unblock route guard immediately using cached session

          // Verify token in the background to ensure session is still valid
          api.get('/auth/me')
            .then(profile => {
              setUser(profile);
              localStorage.setItem('user', JSON.stringify(profile));
            })
            .catch(err => {
              console.warn('Background session verification failed:', err.message);
              // If it's a structural auth failure (unauthorized/invalid token), logout
              if (err.message.includes('Token') || err.message.includes('auth') || err.message.includes('expired')) {
                logout();
              }
            });
          return;
        } catch (e) {
          console.error('Failed to parse cached user profile:', e);
        }
      }

      // If no token or parsed cache fails, default to unauthenticated state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    };
    
    loadUser();
  }, []);

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      
      const userProfile = {
        _id: data._id,
        username: data.username,
        email: data.email,
        githubToken: data.githubToken,
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.post('/auth/signup', { username, email, password });
      
      const userProfile = {
        _id: data._id,
        username: data.username,
        email: data.email,
        githubToken: data.githubToken,
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateGithubToken = async (githubToken) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/github-token', { githubToken });
      
      setUser(prev => {
        const updated = prev ? { ...prev, githubToken: data.githubToken } : null;
        if (updated) {
          localStorage.setItem('user', JSON.stringify(updated));
        }
        return updated;
      });
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        updateGithubToken,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
