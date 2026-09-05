import axios from 'axios';

// Define a URL base do backend (Porta 4000 no servidor/LAN/VPN ou /api via proxy)
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const isCapacitor = typeof window.Capacitor !== 'undefined' || window.location.protocol === 'capacitor:';
    if (isCapacitor || (window.location.protocol === 'https:' && window.location.hostname === 'localhost')) {
      const currentHost = window.location.hostname;
      let defaultHost = '26.118.72.235:4000';
      if (currentHost && currentHost.startsWith('192.168.')) {
        defaultHost = `${currentHost}:4000`;
      } else if (currentHost && currentHost === '26.118.72.235') {
        defaultHost = '26.118.72.235:4000';
      }
      const serverHost = localStorage.getItem('api_server_host') || defaultHost;
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
        localStorage.getItem('usuario_logado') ||
        localStorage.getItem('auth_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser');
      if (raw) user = JSON.parse(raw);
    } catch (e) {}

    const token = user?.token || localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const email =
      user?.email ||
      user?.user_metadata?.email ||
      localStorage.getItem('usuario_email') ||
      '';
    if (email) {
      config.headers['x-user-email'] = String(email).trim().toLowerCase();
    }

    const uid =
      user?.id ||
      user?.uid ||
      localStorage.getItem('usuario_id') ||
      '';
    if (uid) {
      config.headers['x-user-id'] = String(uid).trim();
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
