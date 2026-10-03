/**
 * KAVACH CAMPUS — API Module
 * Centralized API communication layer
 */

const API = {
  BASE: '/api',

  getToken() {
    return localStorage.getItem('kavach_token');
  },

  setToken(token) {
    localStorage.setItem('kavach_token', token);
  },

  setUser(user) {
    localStorage.setItem('kavach_user', JSON.stringify(user));
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('kavach_user'));
    } catch { return null; }
  },

  clearAuth() {
    localStorage.removeItem('kavach_token');
    localStorage.removeItem('kavach_user');
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  },

  async request(endpoint, options = {}) {
    const url = `${this.BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'TOKEN_EXPIRED') {
          this.clearAuth();
          window.location.href = '/pages/login.html?expired=1';
          return;
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw { status: response.status, ...data };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      if (!navigator.onLine) {
        throw { error: 'You are offline. Please check your connection.', code: 'OFFLINE' };
      }
      throw { error: 'Network error. Please try again.', code: 'NETWORK_ERROR' };
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async uploadFiles(endpoint, formData) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.BASE}${endpoint}`, {
      method: 'POST', headers, body: formData
    });

    const data = await response.json();
    if (!response.ok) throw { status: response.status, ...data };
    return data;
  },

  // ── Auth endpoints ──
  auth: {
    login: (email, password) => API.post('/auth/login', { email, password }),
    register: (data) => API.post('/auth/register', data),
    verifyOtp: (email, code, purpose) => API.post('/auth/verify-otp', { email, code, purpose }),
    resendOtp: (email, purpose) => API.post('/auth/resend-otp', { email, purpose }),
    forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
    resetPassword: (resetToken, newPassword) => API.post('/auth/reset-password', { resetToken, newPassword }),
    getProfile: () => API.get('/auth/profile'),
    updateProfile: (data) => API.put('/auth/profile', data),
  },

  // ── Cases endpoints ──
  cases: {
    create: (data) => API.post('/cases', data),
    getMy: () => API.get('/cases/my'),
    getAll: (params = '') => API.get(`/cases?${params}`),
    getById: (id) => API.get(`/cases/${id}`),
    acknowledge: (id) => API.post(`/cases/${id}/acknowledge`),
    assign: (id, assigned_to) => API.post(`/cases/${id}/assign`, { assigned_to }),
    addNote: (id, note) => API.post(`/cases/${id}/notes`, { note }),
    escalate: (id, reason) => API.post(`/cases/${id}/escalate`, { reason }),
    resolve: (id, resolution_notes) => API.post(`/cases/${id}/resolve`, { resolution_notes }),
    getStats: () => API.get('/cases/stats/overview'),
  },

  // ── Evidence ──
  evidence: {
    upload: (caseId, files) => {
      const formData = new FormData();
      formData.append('case_id', caseId);
      for (const file of files) formData.append('files', file);
      return API.uploadFiles('/evidence/upload', formData);
    }
  },

  // ── Notifications ──
  notifications: {
    getAll: () => API.get('/notifications'),
    markRead: (id) => API.put(`/notifications/${id}/read`),
    markAllRead: () => API.put('/notifications/read-all'),
  },

  // ── Safe Walk ──
  safeWalk: {
    start: (data) => API.post('/safe-walk/start', data),
    complete: (id) => API.put(`/safe-walk/${id}/complete`),
    getActive: () => API.get('/safe-walk/active'),
  },

  // ── Trusted Contacts ──
  contacts: {
    getAll: () => API.get('/trusted-contacts'),
    add: (data) => API.post('/trusted-contacts', data),
    remove: (id) => API.delete(`/trusted-contacts/${id}`),
  },

  // ── Admin ──
  admin: {
    getUsers: () => API.get('/admin/users'),
    updateRole: (id, role) => API.put(`/admin/users/${id}/role`, { role }),
    getAiConfig: () => API.get('/admin/ai-config'),
    updateAiConfig: (key, value) => API.put('/admin/ai-config', { key, value }),
    getAuditLogs: (params = '') => API.get(`/admin/audit-logs?${params}`),
    getAnalytics: () => API.get('/admin/analytics'),
    getStaff: () => API.get('/admin/staff'),
  },

  // ── System ──
  system: {
    status: () => API.get('/system/status'),
  }
};

window.API = API;
