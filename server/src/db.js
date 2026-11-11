// Shared PostgreSQL connection pool.
// Copy this same file to admin-app/backend/src/db.js (or import from a shared package).
// Never hardcode credentials here — use DATABASE_URL in every environment.
//
// In the one-app Cloudflare Worker, FENOTE_WORKER_RUNTIME=cloudflare switches
// to a request-scoped pg.Client instead of a module-global Pool, because
// Workers forbid cross-request I/O objects and Hyperdrive owns the real pool.
const isWorkerRuntime = process.env.FENOTE_WORKER_RUNTIME === 'cloudflare';

if (isWorkerRuntime) {
  const { getRequestClient } = require('./workerDbContext');

  const workerDb = {
    query: (...args) => getRequestClient().query(...args),
    connect: async () => {
      const client = getRequestClient();
      if (typeof client.release !== 'function') client.release = () => {};
      return client;
    },
    on: (...args) => {
      getRequestClient().on(...args);
      return workerDb;
    },
  };

  module.exports = workerDb;
} else {
  const path = require('path');
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
  require('dotenv').config();

  const { Pool } = require('pg');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. See deploy/.env.example.server');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL || '';
  // Hosted Supabase Postgres requires TLS even when NODE_ENV is unset locally.
  // Auto-detect Supabase hosts, but let DATABASE_SSL=false keep plain local PG17.
  // Do not append ?sslmode=require: pg 8.21 can treat it as verify-full.
  const supabaseHost = /supabase\.(co|com)/i.test(databaseUrl);
  const sslEnabled =
    process.env.DATABASE_SSL === 'true' ||
    (process.env.DATABASE_SSL !== 'false' && (isProduction || supabaseHost));
  const ssl = sslEnabled ? { rejectUnauthorized: false } : false;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });

  module.exports = pool;
}
