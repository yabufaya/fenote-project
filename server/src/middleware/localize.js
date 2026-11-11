// Public content localization middleware.
//
// Every public content row has a `translations` JSONB column shaped like:
//   { "en": { "title": "..." }, "am": { "title": "..." } }
//
// The public SPA sends ?lang=en or ?lang=am. This middleware overlays only
// safe display-string keys on the existing row, so internal filter keys such
// as category / region / package_key stay stable and image URLs, ids, numbers
// and timestamps are never translated. The raw `translations` object is
// removed from public responses; the admin API returns it unchanged for editing.

const SUPPORTED_LANGS = new Set(['en', 'am']);
const INTERNAL_KEYS = new Set([
  'id', 'created_at', 'updated_at',
  'imageurl', 'image_url', 'downloadurl', 'video_url',
  'map_embed_url', 'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'linkedin_url',
  'read_more_link', 'slug',
  'category', 'region', 'package_key',
  'rate', 'years_experience', 'clients_served', 'services_count', 'order',
  'bordercolor', 'textcolor',
  'translations',
]);

function parseLang(value) {
  const requested = String(value || '').toLowerCase();
  if (requested.startsWith('am')) return 'am';
  if (requested.startsWith('en')) return 'en';
  if (/\bam\b/.test(requested)) return 'am';
  if (/\ben\b/.test(requested)) return 'en';
  return null;
}

function normalizeLang(req) {
  // An explicit ?lang=en/am wins; an unsupported value falls through to the
  // X-Content-Language / Accept-Language headers before the English default.
  return parseLang(req.query?.lang)
    || parseLang(req.headers['x-content-language'])
    || parseLang(req.headers['accept-language'])
    || 'en';
}

function localizeRow(row, lang) {
  const { translations, ...rest } = row;
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    return rest;
  }
  const overlay = translations[lang];
  if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) return rest;
  const merged = { ...rest };
  Object.keys(overlay).forEach((key) => {
    if (INTERNAL_KEYS.has(key)) return;
    if (!(key in rest)) return;
    const value = overlay[key];
    // Empty strings are deliberate "not translated yet" placeholders: keep the
    // English/base value until the admin supplies real Amharic wording.
    if (value === '' || value === null) return;
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      merged[key] = value;
    }
  });
  return merged;
}

function localizeValue(value, lang) {
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, lang));
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if ('translations' in value) return localizeRow(value, lang);
  const result = {};
  Object.keys(value).forEach((key) => {
    result[key] = localizeValue(value[key], lang);
  });
  return result;
}

module.exports = function localizeContent(req, res, next) {
  // Mounted with app.use('/api/', ...): req.path is already stripped to e.g.
  // "/about", so use the original URL for the /api/ guard.
  if (req.method !== 'GET' || !req.originalUrl.startsWith('/api/')) return next();
  const lang = normalizeLang(req);
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(localizeValue(body, lang));
  return next();
};

module.exports.normalizeLang = normalizeLang;
module.exports.localizeValue = localizeValue;
