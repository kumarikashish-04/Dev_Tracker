const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

/**
 * Configure API headers with auth token
 */
const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Custom fetch wrapper for auth/analytics requests
 */
const api = {
  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');
      return data;
    } catch (error) {
      console.error(`API GET ${endpoint} failed:`, error.message);
      throw error;
    }
  },

  post: async (endpoint, body = {}) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');
      return data;
    } catch (error) {
      console.error(`API POST ${endpoint} failed:`, error.message);
      throw error;
    }
  },

  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Something went wrong');
      return data;
    } catch (error) {
      console.error(`API DELETE ${endpoint} failed:`, error.message);
      throw error;
    }
  },
};

export default api;
