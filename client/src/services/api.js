import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aquatrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isAuthLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isAuthLogin) {
      localStorage.removeItem('aquatrack_token');
      localStorage.removeItem('aquatrack_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || { message: error.message || 'Network error' });
  }
);

export default api;

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Customers
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  getMe: () => api.get('/customers/me'),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  syncAuth: () => api.post('/customers/sync-auth'),
};

// Staff
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getOne: (id) => api.get(`/staff/${id}`),
  getMe: () => api.get('/staff/me'),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  getActiveLocations: () => api.get('/staff/active/locations'),
};

// Deliveries
export const deliveryAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getOne: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  update: (id, data) => api.put(`/deliveries/${id}`, data),
  delete: (id) => api.delete(`/deliveries/${id}`),
  getToday: () => api.get('/deliveries/today'),
  getStats: (params) => api.get('/deliveries/stats', { params }),
};

// Returns
export const returnAPI = {
  getAll: (params) => api.get('/returns', { params }),
  create: (data) => api.post('/returns', data),
};

// Damages
export const damageAPI = {
  getAll: (params) => api.get('/damages', { params }),
  create: (data) => api.post('/damages', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/damages/${id}`, data),
};

// Refills
export const refillAPI = {
  getAll: (params) => api.get('/refills', { params }),
  getOne: (id) => api.get(`/refills/${id}`),
  create: (data) => api.post('/refills', data),
  update: (id, data) => api.put(`/refills/${id}`, data),
  assignStaff: (id, staffId) => api.put(`/refills/${id}/assign`, { staffId }),
};

// Locations
export const locationAPI = {
  update: (data) => api.post('/locations', data),
  getStaff: (staffId) => api.get(`/locations/${staffId}`),
  offDuty: () => api.post('/locations/off-duty'),
};

// Analytics
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  deliveries: (params) => api.get('/analytics/deliveries', { params }),
  customers: () => api.get('/analytics/customers'),
  damages: () => api.get('/analytics/damages'),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Ratings
export const ratingAPI = {
  create: (data) => api.post('/ratings', data),
  getAll: () => api.get('/ratings'),
};

// Payments
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};
