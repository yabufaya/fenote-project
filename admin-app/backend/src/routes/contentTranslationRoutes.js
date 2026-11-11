const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// One translations JSONB column serves all public content tables. The table
// name is never taken from user input directly; only these 15 tables are
// writable through this endpoint.
const ALLOWED_TABLES = new Set([
  'about', 'blog', 'client', 'contact', 'gallery', 'hero_content', 'hero_slide',
  'highlight', 'payment_packages', 'payment_settings', 'resource', 'services',
  'team', 'team_members', 'testimonial',
]);
const ALLOWED_LANGS = new Set(['en', 'am']);

function cleanValues(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null;
  const keys = Object.keys(values);
  if (keys.length > 80) return null;
  const cleaned = {};
  for (const key of keys) {
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(key)) return null;
    const value = values[key];
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return null;
    if (typeof value === 'string' && value.length > 8000) return null;
    cleaned[key] = value;
  }
  return cleaned;
}

async function resolveRowId(table, requestedId) {
  if (requestedId !== undefined && requestedId !== null && requestedId !== '') {
    const id = Number.parseInt(requestedId, 10);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
  }
  const result = await pool.query(
    `SELECT id FROM public.${table} ORDER BY id LIMIT 1`
  );
  return result.rows[0]?.id ?? null;
}

router.get('/', async (req, res) => {
  const { table } = req.query;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, message: 'Unsupported content table' });
  }
  try {
    const id = await resolveRowId(table, req.query.id);
    if (!id) return res.status(404).json({ success: false, message: 'Content row not found' });
    const result = await pool.query(
      `SELECT id, translations FROM public.${table} WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Content row not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get translations error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/', async (req, res) => {
  const { table, id, lang, values } = req.body || {};
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ success: false, message: 'Unsupported content table' });
  }
  if (!ALLOWED_LANGS.has(lang)) {
    return res.status(400).json({ success: false, message: 'Language must be en or am' });
  }
  const cleaned = cleanValues(values);
  if (!cleaned) {
    return res.status(400).json({ success: false, message: 'Values must be a small object of text / number / boolean fields' });
  }
  try {
    const rowId = await resolveRowId(table, id);
    if (!rowId) return res.status(404).json({ success: false, message: 'Content row not found' });
    const result = await pool.query(
      `UPDATE public.${table}
       SET translations = jsonb_set(
         coalesce(translations, '{}'::jsonb),
         array[$1::text],
         $2::jsonb,
         true
       )
       WHERE id = $3
       RETURNING id, translations`,
      [lang, JSON.stringify(cleaned), rowId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Content row not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update translations error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
