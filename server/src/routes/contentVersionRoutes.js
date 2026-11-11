// Lightweight, PII-free content change stamp.
//
// Browsers keep their own copy of every content row. After a successful write,
// they need a deterministic signal that the database changed even when the
// Supabase Realtime WebSocket is unavailable. This endpoint returns only a
// hash and per-table counters/transaction stamps -- never row contents.
const express = require('express');
const pool = require('../db');

const router = express.Router();

// Keep this list in sync with the public/admin usePublicRealtime subscriptions
// and with deploy/supabase/01_rls.sql's Realtime publication.
const CONTENT_TABLES = [
  'about', 'blog', 'client', 'contact', 'gallery', 'hero_content',
  'hero_slide', 'highlight', 'payment_packages', 'payment_settings',
  'resource', 'services', 'team', 'team_members', 'testimonial',
  'booking_availability_state',
];

const EMPTY_VERSION = 'd41d8cd98f00b204e9800998ecf8427e'; // md5('')

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function noStore(req, res, next) {
  // Drop conditional headers so a stale 304 cannot masquerade as a fresh read.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

router.use(noStore);

router.get('/', async (_req, res) => {
  try {
    const existing = await pool.query(
      `select table_name
         from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
        order by table_name`,
      [CONTENT_TABLES]
    );

    const tables = existing.rows.map((row) => row.table_name);
    if (tables.length === 0) {
      return res.status(200).json({
        success: true,
        version: EMPTY_VERSION,
        tables: {},
        checked_at: new Date().toISOString(),
      });
    }

    // xmin is a system column on every Postgres table. A row insert/update
    // gets a newer xmin; count(*) also catches deletes. No schema migration,
    // timestamp column, trigger or table-content exposure is required.
    const stamps = tables.map((table) => (
      `select ${quoteLiteral(table)} as table_name,
              count(*)::text || ':' || coalesce(max((xmin::text)::bigint)::text, '0') as stamp
         from public.${quoteIdent(table)}`
    ));

    const result = await pool.query(
      `with stamps as (${stamps.join(' union all ')})
       select md5(coalesce(string_agg(table_name || ':' || stamp, '|' order by table_name), '')) as version,
              coalesce(jsonb_object_agg(table_name, stamp), '{}'::jsonb) as tables
         from stamps`
    );

    const row = result.rows[0] || {};
    return res.status(200).json({
      success: true,
      version: row.version || EMPTY_VERSION,
      tables: row.tables || {},
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Content version error:', error.code || 'unknown');
    return res.status(500).json({ success: false, message: 'Could not check content version' });
  }
});

module.exports = router;
