import axios from 'axios';

// Membuat baseURL pintar mendeteksi lingkungan produksi vs lokal
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Jika berjalan di Vercel (Production), tembak domain utama Vercel + /api
    if (window.location.hostname !== 'localhost') {
      return `${window.location.origin}/api`;
    }
  }
  // Jika di laptop sendiri (Development), tetap tembak port Express lokal
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000,
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;