// Cloudflare Worker entry for the PUBLIC Express API.
// If you copy this to the repo root, change the require path to './server/src/server.js'.
// Requires compatibility_date >= 2026-08-04 (nodejs_compat is then default).
// Official pattern: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/

import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createRequire } from 'node:module';

// Hyperdrive provides a pooled connection string to Supabase Postgres.
// (Use Supabase's DIRECT connection string in the Hyperdrive config, not the pooler.)
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
for (const key of [
  'NODE_ENV', 'PG_POOL_MAX', 'ALLOWED_ORIGINS', 'ADMIN_URL', 'PUBLIC_URL',
  'ADMIN_APP_ORIGIN', 'UPLOAD_DIR',
]) {
  if (env[key] !== undefined) process.env[key] = env[key];
}

const require = createRequire(import.meta.url);
const app = require('../../server/src/server.js');

app.listen(3000);
export default httpServerHandler({ port: 3000 });
