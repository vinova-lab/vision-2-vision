import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach JWT token to all admin requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Public endpoints ─────────────────────────────────────────────────────────
export const getCategories = () => api.get('/categories').then(r => r.data.categories);
export const submitFeedback = (data) => api.post('/feedback', data).then(r => r.data);
export const getFeedbackCount = () => api.get('/feedback/count').then(r => r.data.count);
export const getHealth = () => api.get('/health').then(r => r.data);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email, password) => api.post('/auth/login', { email, password }).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data.admin);

// ─── Admin Feedback ───────────────────────────────────────────────────────────
export const getAdminFeedback = (params) => api.get('/admin/feedback', { params }).then(r => r.data);
export const getFeedbackDetail = (id) => api.get(`/admin/feedback/${id}`).then(r => r.data.feedback);
export const moderateFeedback = (id, status, reason) => api.patch(`/admin/feedback/${id}/moderate`, { status, reason }).then(r => r.data);
export const reanalyzeFeedback = (id) => api.post(`/admin/feedback/${id}/reanalyze`).then(r => r.data);

// ─── Admin Analytics ──────────────────────────────────────────────────────────
export const getAnalyticsSummary = () => api.get('/admin/analytics/summary').then(r => r.data);
export const getAnalyticsTrends = (params) => api.get('/admin/analytics/trends', { params }).then(r => r.data);
export const getAnalyticsCategories = (params) => api.get('/admin/analytics/categories', { params }).then(r => r.data);
export const getAnalyticsTopics = (params) => api.get('/admin/analytics/topics', { params }).then(r => r.data);
