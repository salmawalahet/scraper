import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const { accessToken } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Variables to manage queued requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const tokens = localStorage.getItem('tokens');
        if (!tokens) throw new Error('No tokens');

        const { refreshToken } = JSON.parse(tokens);
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const newTokens = response.data.data.tokens;
        localStorage.setItem('tokens', JSON.stringify(newTokens));

        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

        processQueue(null, newTokens.accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ============================================
// API Service Functions
// ============================================

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Jobs
export const jobsApi = {
  create: (data: { name: string; target_url: string; search_query?: string; config?: Record<string, unknown> }) =>
    api.post('/jobs', data),
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/jobs', { params }),
  getById: (id: number) => api.get(`/jobs/${id}`),
  pause: (id: number) => api.post(`/jobs/${id}/pause`),
  resume: (id: number) => api.post(`/jobs/${id}/resume`),
  cancel: (id: number) => api.post(`/jobs/${id}/cancel`),
  retry: (id: number) => api.post(`/jobs/${id}/retry`),
  delete: (id: number) => api.delete(`/jobs/${id}`),
  getStats: () => api.get('/jobs/stats'),
  updateSchedule: (id: number, data: { cron?: string; tz?: string; enabled?: boolean }) =>
    api.patch(`/jobs/${id}/schedule`, data),
};

// Leads
export const leadsApi = {
  search: (params: Record<string, unknown>) => api.get('/leads', { params }),
  getById: (id: number) => api.get(`/leads/${id}`),
  bulkAction: (data: { ids: number[]; action: string; data?: Record<string, unknown> }) =>
    api.post('/leads/bulk', data),
  getCategories: () => api.get('/leads/categories'),
  aiEnrich: (id: number, senderName?: string) => api.post(`/leads/${id}/ai-enrich`, { senderName }),
};

// Exports
export const exportsApi = {
  create: (data: { format: string; filters?: Record<string, unknown>; leadIds?: number[]; jobId?: number }) =>
    api.post('/exports', data),
  list: (params?: { page?: number; limit?: number }) =>
    api.get('/exports', { params }),
  download: (id: number) =>
    api.get(`/exports/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/exports/${id}`),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getLeadTrends: (days?: number) => api.get('/analytics/lead-trends', { params: { days } }),
  getJobAnalytics: () => api.get('/analytics/jobs'),
  getExportAnalytics: () => api.get('/analytics/exports'),
  getQualityDistribution: () => api.get('/analytics/quality'),
  getRecentActivity: (limit?: number) => api.get('/analytics/activity', { params: { limit } }),
  getQueryWiseStats: () => api.get('/analytics/query-wise'),
  exportQueryWise: (jobId: number) => api.get(`/analytics/query-wise/${jobId}/export`, { responseType: 'blob' }),
};

