/**
 * API Client
 * Axios instance with interceptors for authentication
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { notifications } from '@mantine/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: { message: string } }>) => {
    const message = error.response?.data?.error?.message || 'An error occurred';

    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }

    // Show error notification
    notifications.show({
      title: 'Error',
      message,
      color: 'red',
    });

    return Promise.reject(error);
  }
);

// ============================================================================
// API METHODS
// ============================================================================

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Files
export const filesApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/files', { params }),
  getById: (id: string) => api.get(`/files/${id}`),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: (id: string) => api.get(`/files/${id}/download`),
  delete: (id: string) => api.delete(`/files/${id}`),
  process: (id: string) => api.post(`/files/${id}/process`),
};

// Jobs
export const jobsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  getStats: () => api.get('/jobs/stats'),
  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),
};

export default api;

