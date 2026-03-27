import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Interceptor para adicionar token JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const condoSchema = localStorage.getItem('condoSchema');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (condoSchema) {
    config.headers['X-Condo-Schema'] = condoSchema;
  }

  return config;
});

// Interceptor para tratar erros
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { client as api };
export default client;
