const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// The public language button changes i18next's stored language. Send the same
// language to the public API so database-backed text is localized too.
const contentLanguage = () => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
  const docLang = typeof document !== 'undefined' ? document.documentElement.lang : null;
  const value = (stored || docLang || 'en').toLowerCase();
  return value.startsWith('am') ? 'am' : 'en';
};

const withLang = (path) => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}lang=${encodeURIComponent(contentLanguage())}`;
};

const getJSON = async (path, label) => {
  const response = await fetch(`${API_BASE_URL}${withLang(path)}`, { cache: 'no-store' });
  if (response.status === 429) {
    throw new Error(`Too many requests fetching ${label}; wait for the rate-limit window to reset and refresh`);
  }
  if (!response.ok) throw new Error(`Failed to fetch ${label}`);
  return response.json();
};

const postJSON = async (path, data, label) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (response.status === 429) {
    throw new Error(`Too many requests to ${label}; wait for the rate-limit window to reset`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || `Failed to ${label}`);
    error.status = response.status;
    error.code = body?.code;
    throw error;
  }
  return body;
};

export const api = {
  // Blog API
  getRecentBlogs: () => getJSON('/blog/blogs/recent', 'recent blogs'),
  getAllBlogs: (page = 1, limit = 10) => getJSON(`/blog/blogs?page=${page}&limit=${limit}`, 'blogs'),
  getBlogBySlug: (slug) => getJSON(`/blog/blogs/${slug}`, 'blog'),

  // Highlight API
  getHighlight: () => getJSON('/highlight/highlight', 'highlight'),

  // Testimonials API
  getTestimonials: () => getJSON('/testimonials', 'testimonials'),

  // Resources API
  getResources: () => getJSON('/resources', 'resources'),

  // Gallery API
  getGallery: () => getJSON('/gallery', 'gallery'),

  // Team API
  getTeam: () => getJSON('/team', 'team'),

  // Services API
  // `cache: 'no-store'` already prevents stale reads; a timestamp query made
  // every refetch look unique to proxies/rate-limit dashboards.
  getServices: () => getJSON('/services', 'services'),

  // Clients API
  getClients: () => getJSON('/clients', 'clients'),

  // Contact API
  getContact: () => getJSON('/contact', 'contact'),

  // Hero API (content + slides)
  getHeroData: () => getJSON('/hero', 'hero data'),

  // About API
  getAbout: () => getJSON('/about', 'about data'),

  // Payments API
  getPayments: () => getJSON('/payments', 'payment data'),

  // Public booking availability (safe, PII-free data only)
  getBookingAvailability: () => getJSON('/bookings/availability', 'booking availability'),
  getBookingSlots: (date) => getJSON(`/bookings/slots?date=${encodeURIComponent(date)}`, 'available times'),

  // Public writes
  createBooking: (data) => postJSON('/bookings', data, 'submit booking'),
  subscribe: (email) => postJSON('/subscribers', { email }, 'subscribe'),
  sendContactMessage: (data) => postJSON('/messages', data, 'send message'),
};

export { contentLanguage };
