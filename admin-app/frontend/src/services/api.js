import axios from 'axios';
import { supabase } from '../lib/supabase';
import { uploadAsset } from './storage';
import { adminPath } from '../lib/basePath';

// Generic bilingual content editor: uploads media first, then writes base
// English columns and en/am translations in one protected API transaction.
export const contentAPI = {
  // A unique query makes even an intermediary that ignores no-store unable to
  // return the pre-save GET. The backend also sends Cache-Control: no-store.
  list: (table) => api.get(`/content/${table}`, { params: { _: Date.now() } }),
  save: async (table, id, values, translations, files = {}) => {
    const payload = { ...values };
    for (const [column, file] of Object.entries(files || {})) {
      if (file instanceof File || file instanceof Blob) {
        const url = await uploadAsset(file, table);
        if (url) payload[column] = url;
      }
    }
    const body = { values: payload, translations };
    return id ? api.put(`/content/${table}/${id}`, body) : api.post(`/content/${table}`, body);
  },
  remove: (table, id) => api.delete(`/content/${table}/${id}`),
};

export const bookingAvailabilityAPI = {
  get: () => api.get('/booking-availability'),
  update: (payload) => api.put('/booking-availability', payload),
};

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Keep the Bearer token supplied by AuthProvider. Calling
// supabase.auth.getSession() from inside onAuthStateChange can deadlock the
// Supabase auth client, which previously left the admin SPA on "Loading...".
let currentAccessToken = null;
export const setAdminAccessToken = (token) => {
  currentAccessToken = token || null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

const toFormData = (data) => {
  const fd = new FormData();
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value === null || value === undefined) return;
    fd.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
  });
  return fd;
};

api.interceptors.request.use((config) => {
  if (currentAccessToken) config.headers.Authorization = `Bearer ${currentAccessToken}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    setAdminAccessToken(null);
    await supabase.auth.signOut().catch(() => {});
    window.location.href = adminPath('/login');
  }
  return Promise.reject(error);
});

async function sendWithUploads(method, url, data, section, fieldMap = { image: 'imageurl' }) {
  const payload = { ...data };
  let useJson = true;
  for (const [field, bodyKey] of Object.entries(fieldMap)) {
    const value = payload[field];
    if (value instanceof File || value instanceof Blob) {
      const uploadedUrl = await uploadAsset(value, section);
      if (uploadedUrl) { payload[bodyKey] = uploadedUrl; delete payload[field]; }
      else { delete payload[bodyKey]; useJson = false; }
    } else if (value === null || value === undefined) {
      delete payload[field];
    }
  }
  if (useJson) return api.request({ method, url, data: payload });
  return api.request({ method, url, data: toFormData(payload), headers: { 'Content-Type': 'multipart/form-data' } });
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put(`/notifications/read-all`),
};
export const adminProfileAPI = {
  getMe: () => api.get('/admins/me'),
  list: () => api.get('/admins'),
  create: (email) => api.post('/admins', { email }),
  invite: (id) => api.post(`/admins/${id}/invite`),
  setActive: (id, is_active) => api.put(`/admins/${id}`, { is_active }),
  remove: (id) => api.delete(`/admins/${id}`),
};
export const translationAPI = {
  get: (table, id) => api.get('/translations', { params: { table, ...(id ? { id } : {}) } }),
  update: (table, id, lang, values) => api.put('/translations', { table, id, lang, values }),
};
export const blogAPI = {
  getAllBlogs: () => api.get('/blogs'),
  getBlogById: (id) => api.get(`/blogs/${id}`),
  createBlog: (data) => sendWithUploads('post', '/blogs', data, 'blogs'),
  updateBlog: (id, data) => sendWithUploads('put', `/blogs/${id}`, data, 'blogs'),
  deleteBlog: (id) => api.delete(`/blogs/${id}`),
};
export const resourceAPI = {
  getAllResources: () => api.get('/resources'),
  getResourceById: (id) => api.get(`/resources/${id}`),
  createResource: (data) => sendWithUploads('post', '/resources', data, 'resources', { image: 'imageurl', pdf: 'downloadurl' }),
  updateResource: (id, data) => sendWithUploads('put', `/resources/${id}`, data, 'resources', { image: 'imageurl', pdf: 'downloadurl' }),
  deleteResource: (id) => api.delete(`/resources/${id}`),
};
export const testimonialAPI = {
  getAllTestimonials: () => api.get('/testimonials'),
  getTestimonialById: (id) => api.get(`/testimonials/${id}`),
  createTestimonial: (data) => sendWithUploads('post', '/testimonials', data, 'testimonials'),
  updateTestimonial: (id, data) => sendWithUploads('put', `/testimonials/${id}`, data, 'testimonials'),
  deleteTestimonial: (id) => api.delete(`/testimonials/${id}`),
};
export const teamAPI = {
  getAllTeams: () => api.get('/teams'),
  getTeamById: (id) => api.get(`/teams/${id}`),
  createTeam: (data) => sendWithUploads('post', '/teams', data, 'team'),
  updateTeam: (id, data) => sendWithUploads('put', `/teams/${id}`, data, 'team'),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
};
export const teamMembersAPI = {
  getAllTeamMembers: () => api.get('/team-members'),
  getTeamMemberById: (id) => api.get(`/team-members/${id}`),
  createTeamMember: (data) => sendWithUploads('post', '/team-members', data, 'team'),
  updateTeamMember: (id, data) => sendWithUploads('put', `/team-members/${id}`, data, 'team'),
  deleteTeamMember: (id) => api.delete(`/team-members/${id}`),
};
export const bookingAPI = {
  getAllBookings: () => api.get('/bookings'),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  updateBookingStatus: (id, status, notes) => api.put(`/bookings/${id}/status`, { status, notes }),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
};
export const galleryAPI = {
  getAllGallery: () => api.get('/gallery'),
  getGalleryById: (id) => api.get(`/gallery/${id}`),
  createGallery: (data) => sendWithUploads('post', '/gallery', data, 'gallery', { image: 'imageurl', video: 'video_url' }),
  updateGallery: (id, data) => sendWithUploads('put', `/gallery/${id}`, data, 'gallery', { image: 'imageurl', video: 'video_url' }),
  deleteGallery: (id) => api.delete(`/gallery/${id}`),
};
export const clientAPI = {
  getAllClients: () => api.get('/clients'),
  createClient: (data) => sendWithUploads('post', '/clients', data, 'clients'),
  deleteClient: (id) => api.delete(`/clients/${id}`),
};
export const contactAPI = {
  getContact: () => api.get('/contacts'),
  updateContact: (data) => api.put('/contacts', data),
};
export const highlightAPI = {
  getAllHighlights: () => api.get('/highlights'),
  getHighlightById: (id) => api.get(`/highlights/${id}`),
  createHighlight: (data) => sendWithUploads('post', '/highlights', data, 'highlights', { image: 'image_url' }),
  updateHighlight: (id, data) => sendWithUploads('put', `/highlights/${id}`, data, 'highlights', { image: 'image_url' }),
  deleteHighlight: (id) => api.delete(`/highlights/${id}`),
};
export const serviceAPI = {
  getAllServices: () => api.get('/services'),
  getServiceById: (id) => api.get(`/services/${id}`),
  createService: (data) => api.post('/services', data),
  updateService: (id, data) => api.put(`/services/${id}`, data),
  deleteService: (id) => api.delete(`/services/${id}`),
};
export const heroAPI = {
  getHeroData: () => api.get('/hero'),
  updateContent: (data) => api.put('/hero/content', data),
  createSlide: (data) => sendWithUploads('post', '/hero/slides', data, 'carousel'),
  deleteSlide: (id) => api.delete(`/hero/slides/${id}`),
};
export const aboutAPI = {
  getAbout: () => api.get('/about'),
  updateAbout: (data) => api.put('/about', data),
};
export const paymentAPI = {
  getPayments: () => api.get('/payments'),
  updatePackage: (id, data) => api.put(`/payments/package/${id}`, data),
  updateSettings: (data) => api.put('/payments/settings', data),
};
export const subscriberAPI = {
  getSubscribers: () => api.get('/subscribers'),
  deleteSubscriber: (id) => api.delete(`/subscribers/${id}`),
};
export const contactMessageAPI = {
  getContactMessages: () => api.get('/messages'),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  markAllAsRead: () => api.put(`/messages/read-all`),
  deleteContactMessage: (id) => api.delete(`/messages/${id}`),
};
export const campaignAPI = {
  getCampaigns: () => api.get('/campaigns'),
  createCampaign: (data) => api.post('/campaigns', data),
  updateCampaignStatus: (id, status) => api.put(`/campaigns/${id}/status`, { status }),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),
};
export const liveBookingAPI = { getTodayBookings: () => api.get('/bookings/today') };
export default api;
