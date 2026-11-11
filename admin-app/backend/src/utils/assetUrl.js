// Accept a public Supabase Storage URL from the browser (direct upload) or a
// legacy /uploads path from the local multer fallback. Never accept data:,
// javascript:, or relative protocol URLs.
function directAssetUrl(value) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.startsWith('/uploads/')) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    // Allow the configured Supabase origin plus any https CDN/custom domain.
    return url.toString();
  } catch {
    return null;
  }
}

function resolveAsset(req, { field, bodyKey, section }) {
  const fromBody = directAssetUrl(req.body?.[bodyKey]);
  if (fromBody) return fromBody;

  const file =
    req.file ||
    (req.files && req.files[field] && req.files[field][0]) ||
    null;
  if (file) return `/uploads/${section}/${file.filename}`;
  return undefined;
}

module.exports = { directAssetUrl, resolveAsset };
