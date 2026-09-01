import axios from 'axios';

// Define a URL base do backend (Porta 4000 no servidor/LAN ou /api via proxy)
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const isCapacitor = typeof window.Capacitor !== 'undefined' || window.location.protocol === 'capacitor:';
    if (isCapacitor || (window.location.protocol === 'https:' && window.location.hostname === 'localhost')) {
      const serverHost = localStorage.getItem('api_server_host') || '192.168.40.67:4000';
      return `http://${serverHost}/api`;
    }
  }
  return '/api';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisições
api.interceptors.request.use(
  (config) => {
    let user = null;
    try {
      const raw =
        localStorage.getItem('auth_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser');
      if (raw) user = JSON.parse(raw);
    } catch (e) {}

    if (user) {
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
      const email = user.email || user.user_metadata?.email || '';
      if (email) {
        config.headers['x-user-email'] = email.toLowerCase();
      }
      const uid = user.id || user.uid || '';
      if (uid) {
        config.headers['x-user-id'] = String(uid);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respostas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API Client] Acesso não autorizado.');
    }
    return Promise.reject(error);
  }
);

export default api;
