import axios from 'axios';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const API_URL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends the httpOnly admin cookie
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (
      err.response?.status === 401 &&
      url.startsWith('/admin') &&
      !url.startsWith('/admin/login') &&
      !url.startsWith('/admin/me')
    ) {
      window.dispatchEvent(new Event('admin-session-expired'));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (err?.request && !err.response) return 'Cannot reach the server. Please check your connection and try again.';
  return fallback;
}

/** Local-disk images are stored as /uploads/..., Cloudinary images are absolute URLs. */
export function imageSrc(url) {
  if (!url) return '';
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`;
  return url;
}

/* ------------------------------ Public API ------------------------------ */
export const publicApi = {
  getCategories: () => api.get('/categories').then((r) => r.data.data),
  getCategory: (id) => api.get(`/categories/${id}`).then((r) => r.data.data),
  getTattoos: (params) => api.get('/tattoos', { params }).then((r) => r.data),
  getTattoo: (id) => api.get(`/tattoos/${id}`).then((r) => r.data.data),
  getApprovedFeedback: (params) => api.get('/feedback/approved', { params }).then((r) => r.data),
  submitFeedback: (formData) => api.post('/feedback', formData).then((r) => r.data),
  submitLetteringRequest: (body) => api.post('/lettering-requests', body).then((r) => r.data),
};

/* ------------------------------- Admin API ------------------------------ */
export const adminApi = {
  login: (identifier, password) => api.post('/admin/login', { identifier, password }).then((r) => r.data.data),
  logout: () => api.post('/admin/logout').then((r) => r.data),
  me: () => api.get('/admin/me').then((r) => r.data.data),
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data.data),

  listTattoos: (params) => api.get('/admin/tattoos', { params }).then((r) => r.data),
  getTattoo: (id) => api.get(`/admin/tattoos/${id}`).then((r) => r.data.data),
  suggestTattooName: (formData) => api.post('/admin/tattoos/suggest-name', formData).then((r) => r.data),
  createTattoo: (formData) => api.post('/admin/tattoos', formData).then((r) => r.data),
  updateTattoo: (id, formData) => api.put(`/admin/tattoos/${id}`, formData).then((r) => r.data),
  deleteTattoo: (id) => api.delete(`/admin/tattoos/${id}`).then((r) => r.data),

  listCategories: () => api.get('/admin/categories').then((r) => r.data.data),
  createCategory: (body) => api.post('/admin/categories', body).then((r) => r.data),
  updateCategory: (id, body) => api.put(`/admin/categories/${id}`, body).then((r) => r.data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`).then((r) => r.data),
  listFeedback: (params) => api.get('/admin/feedback', { params }).then((r) => r.data),
  updateFeedbackStatus: (id, status) => api.patch(`/admin/feedback/${id}/status`, { status }).then((r) => r.data),
  deleteFeedback: (id) => api.delete(`/admin/feedback/${id}`).then((r) => r.data),
  listLetteringRequests: (params) => api.get('/admin/lettering-requests', { params }).then((r) => r.data),
  getLetteringRequest: (id) => api.get(`/admin/lettering-requests/${id}`).then((r) => r.data.data),
  updateLetteringRequest: (id, body) => api.patch(`/admin/lettering-requests/${id}`, body).then((r) => r.data),
  deleteLetteringRequest: (id) => api.delete(`/admin/lettering-requests/${id}`).then((r) => r.data),
};

export default api;
