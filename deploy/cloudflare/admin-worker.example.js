// Cloudflare Worker entry for the ADMIN Express API.
// If you copy this to the repo root, change the require path to
// './admin-app/backend/src/server.js'.

import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createRequire } from 'node:module';

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
const app = require('../../admin-app/backend/src/server.js');

app.listen(3000);
export default httpServerHandler({ port: 3000 });
