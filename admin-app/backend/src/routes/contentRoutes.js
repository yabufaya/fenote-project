const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { broadcastContentChange } = require('../utils/contentBroadcast');

// Content reads/writes must use the committed database row, never a browser
// or proxy cache. Deleting conditional headers stops a stale 304 after save.
router.use((req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
router.use(authenticateToken);

// One generic, allowlisted editor endpoint for every public content table.
// The admin SPA sends base (English) columns plus en/am translation objects in
// ONE request; this route writes both in ONE SQL statement. Internal filter
// keys, media URLs, numbers and timestamps are never accepted as translations.
const T = (columns, translatable, options = {}) => ({
  columns: new Set(columns),
  translatable: new Set(translatable),
  required: options.required || [],
  singleton: Boolean(options.singleton),
  orderBy: options.orderBy || 'id asc',
});

const TABLES = {
  about: T(
    ['title1','title2','desc1','desc2','years_experience','clients_served','imageurl'],
    ['title1','title2','desc1','desc2'],
    { singleton: true }
  ),
  blog: T(
    ['title','category','issue','content','imageurl','slug'],
    ['title','issue','content'],
    { required: ['title','category','imageurl'], orderBy: 'created_at desc, id desc' }
  ),
  client: T(
    ['imageurl'],
    [],
    { required: ['imageurl'], orderBy: 'created_at desc, id desc' }
  ),
  contact: T(
    ['map_embed_url','loc_title','loc_subtitle','phone_title','phone_subtitle','email_title','email_subtitle','hours_title','hours_subtitle','full_address','full_phone','full_email','mon_hours','tue_hours','wed_hours','thu_hours','fri_hours','sat_hours','sun_hours','facebook_url','instagram_url','twitter_url','youtube_url','linkedin_url'],
    ['loc_title','loc_subtitle','phone_title','phone_subtitle','email_title','email_subtitle','hours_title','hours_subtitle','full_address','mon_hours','tue_hours','wed_hours','thu_hours','fri_hours','sat_hours','sun_hours'],
    { singleton: true }
  ),
  gallery: T(
    ['imageurl','alttext','category','video_url'],
    ['alttext'],
    { required: ['imageurl','alttext'] }
  ),
  hero_content: T(
    ['title_quote','below_lines'],
    ['title_quote','below_lines'],
    { singleton: true }
  ),
  hero_slide: T(
    ['imageurl'],
    [],
    { required: ['imageurl'], orderBy: 'created_at asc, id asc' }
  ),
  highlight: T(
    ['title','description','image_url','category','read_more_link'],
    ['title','description'],
    { required: ['title','description','image_url'] }
  ),
  payment_packages: T(
    ['region','package_key','duration','price','registration_fee'],
    ['duration','price','registration_fee'],
    { required: ['region','package_key'] }
  ),
  payment_settings: T(
    ['cbe_account','cbe_swift','telebirr_account'],
    [],
    { singleton: true }
  ),
  resource: T(
    ['title','description','downloadurl','category','imageurl'],
    ['title','description'],
    { required: ['title','description'] }
  ),
  services: T(
    ['title','description','category','order'],
    ['title','description'],
    { required: ['title','description','category'], orderBy: '"order" asc, id asc' }
  ),
  team: T(
    ['name','role','description','imageurl','bordercolor','textcolor','order'],
    ['name','role','description'],
    { required: ['name','role','description','imageurl'], orderBy: '"order" asc, id asc' }
  ),
  team_members: T(
    ['name','role','bio','imageurl'],
    ['name','role','bio'],
    { required: ['name','role','bio','imageurl'] }
  ),
  testimonial: T(
    ['name','title','quote','imageurl','rate'],
    ['name','title','quote'],
    { required: ['name','title','quote','imageurl'] }
  ),
};

const NUMERIC_COLUMNS = new Set(['years_experience','clients_served','order','rate']);
const BLOCKED_COLUMNS = new Set([
  'id','created_at','updated_at','translations','files','_id',
]);

function quote(column) {
  return `"${String(column).replace(/"/g, '""')}"`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `item-${Date.now().toString(36)}`;
}

function normalizeValue(column, value) {
  if (value === undefined || value === null) return null;
  if (NUMERIC_COLUMNS.has(column)) {
    if (value === '') return 0;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  const text = String(value);
  return text.length > 20000 ? text.slice(0, 20000) : text;
}

function cleanValues(config, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const cleaned = {};
  for (const [column, raw] of Object.entries(source)) {
    if (BLOCKED_COLUMNS.has(column) || !config.columns.has(column)) continue;
    cleaned[column] = normalizeValue(column, raw);
  }
  return cleaned;
}

function cleanTranslations(config, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const result = {};
  for (const lang of ['en', 'am']) {
    const values = source[lang];
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      result[lang] = {};
      continue;
    }
    const cleaned = {};
    for (const [key, raw] of Object.entries(values)) {
      if (!config.translatable.has(key)) continue;
      if (raw === null || ['string', 'number', 'boolean'].includes(typeof raw)) {
        cleaned[key] = typeof raw === 'string' && raw.length > 20000 ? raw.slice(0, 20000) : raw;
      }
    }
    result[lang] = cleaned;
  }
  return result;
}

async function resolveSingletonId(table) {
  const result = await pool.query(`select id from public.${table} order by id limit 1`);
  return result.rows[0]?.id ?? null;
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function tableColumns(table) {
  const result = await pool.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1",
    [table]
  );
  return new Set(result.rows.map((row) => row.column_name));
}

router.get('/:table', async (req, res) => {
  const config = TABLES[req.params.table];
  if (!config) return res.status(400).json({ success: false, message: 'Unsupported content table' });
  try {
    // xmin is a read-only Postgres system column. It gives every row a
    // monotonic transaction token so the admin can reject a stale cached GET
    // even when updated_at is missing or has the same millisecond.
    const result = await pool.query(`select *, xmin::text as _row_version from public.${req.params.table} order by ${config.orderBy}`);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List content error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not load content' });
  }
});

async function save(req, res) {
  const table = req.params.table;
  const config = TABLES[table];
  if (!config) return res.status(400).json({ success: false, message: 'Unsupported content table' });
  const values = cleanValues(config, req.body?.values);
  const translations = cleanTranslations(config, req.body?.translations);
  if (!values) return res.status(400).json({ success: false, message: 'Values must be an object' });

  try {
    const available = await tableColumns(table);
    let id = req.params.id ? parseId(req.params.id) : null;
    if (req.params.id && !id) return res.status(400).json({ success: false, message: 'Invalid content id' });
    if (!id && config.singleton) id = await resolveSingletonId(table);
    if (table === 'blog' && !values.slug) values.slug = slugify(values.title);
    if (!id) {
      for (const column of config.required) {
        const value = values[column];
        if (value === undefined || value === null || String(value).trim() === '') {
          return res.status(400).json({ success: false, message: `Missing required field: ${column}` });
        }
      }
    }

    // Only reference columns that actually exist. hero_slide in older fresh
    // installs has no updated_at; skipping it keeps the endpoint compatible
    // without a hosted ALTER/migration script.
    const entries = Object.entries(values).filter(([column]) => available.has(column));
    if (entries.length === 0) {
      return res.status(500).json({ success: false, message: 'No writable content columns found' });
    }
    const params = entries.map(([, value]) => value);
    let translationExpr = null;
    if (translations && available.has('translations')) {
      params.push(JSON.stringify(translations.en), JSON.stringify(translations.am));
      // INSERT VALUES cannot read the target table's "translations" column.
      // Build the whole EN/AM object from parameters instead.
      translationExpr = `jsonb_build_object('en', $${params.length - 1}::jsonb, 'am', $${params.length}::jsonb)`;
    }
    const hasUpdatedAt = available.has('updated_at');

    let sql;
    if (id) {
      const setParts = entries.map(([column], index) => `${quote(column)} = $${index + 1}`);
      if (translationExpr) setParts.push(`translations = ${translationExpr}`);
      if (hasUpdatedAt) setParts.push('updated_at = now()');
      params.push(id);
      sql = `update public.${table} set ${setParts.join(', ')} where id = $${params.length} returning *, xmin::text as _row_version`;
    } else {
      const insertCols = entries.map(([column]) => quote(column));
      const insertVals = entries.map((_, index) => `$${index + 1}`);
      if (translationExpr) {
        insertCols.push('"translations"');
        insertVals.push(translationExpr);
      }
      if (hasUpdatedAt) {
        insertCols.push('"updated_at"');
        insertVals.push('now()');
      }
      sql = `insert into public.${table} (${insertCols.join(', ')}) values (${insertVals.join(', ')}) returning *, xmin::text as _row_version`;
    }

    const result = await pool.query(sql, params);
    const saved = result.rows[0];
    // Push a PII-free invalidation signal after the commit. Realtime is an
    // acceleration; failures must never turn a successful save into an error.
    await broadcastContentChange({
      table,
      action: id ? 'update' : 'insert',
      rowId: saved?.id ?? id ?? null,
    });
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A row with that unique value already exists' });
    }
    if (error.code === '23502' || error.code === '22P02') {
      return res.status(400).json({ success: false, message: 'Please check required fields and numeric values' });
    }
    if (error.code === '42703') {
      console.error('Save content schema mismatch:', error.message);
      return res.status(500).json({ success: false, message: 'Content schema mismatch. Restart the admin API after applying the latest patch.' });
    }
    console.error('Save content error:', error.code || 'unknown', error.message || '');
    res.status(500).json({ success: false, message: 'Could not save content' });
  }
}

router.post('/:table', save);
router.put('/:table/:id', save);

router.delete('/:table/:id', async (req, res) => {
  const table = req.params.table;
  const config = TABLES[table];
  if (!config) return res.status(400).json({ success: false, message: 'Unsupported content table' });
  if (config.singleton) return res.status(400).json({ success: false, message: 'Singleton sections cannot be deleted' });
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid content id' });
  try {
    const result = await pool.query(`delete from public.${table} where id = $1 returning id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Content row not found' });
    await broadcastContentChange({ table, action: 'delete', rowId: id });
    res.status(200).json({ success: true, message: 'Content deleted' });
  } catch (error) {
    console.error('Delete content error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not delete content' });
  }
});

module.exports = router;
