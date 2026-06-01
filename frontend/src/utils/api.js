import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

// Handle 401 globally (VERSI AMAN & ANTI NOT-FOUND)
api.interceptors.response.use(
  response => response,
  error => {
    // Hanya lempar ke /login jika user sedang di DALAM aplikasi (dashboard) tapi tokennya expired.
    // Jika error terjadi SAAT user berada di halaman /login (salah password), JANGAN di-redirect!
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;