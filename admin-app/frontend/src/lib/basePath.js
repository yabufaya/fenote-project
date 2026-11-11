// Admin SPA can be hosted at the site root locally, or under /admin in the
// one-app Cloudflare build. Vite injects BASE_URL from the configured `base`.
export const ADMIN_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';

export function adminPath(path = '/') {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${ADMIN_BASE}${suffix}` || '/';
}
