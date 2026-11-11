// ONE Cloudflare Worker: static assets + public SPA + /admin SPA + both APIs.
//
// Public SPA:  /                -> cloudflare-dist/index.html
// Admin SPA:   /admin, /admin/* -> cloudflare-dist/admin/index.html
// Public API:  /api/*           -> public Express app
// Admin API:   /api/admin/*     -> admin Express app
// Health:      /health
//
// Workers forbid binding/async I/O access in global scope. String vars are
// copied from `env` at startup, but env.HYPERDRIVE.connectionString is read
// only inside fetch(). One pg.Client is created per API request; Hyperdrive
// owns the real connection pool.
import { handleAsNodeRequest } from 'cloudflare:node';
import { env as workerEnv } from 'cloudflare:workers';
import workerDbContextImport from '../../server/src/workerDbContext.js';
import appImport from '../../server/src/cloudflareOneApp.js';

// FENOTE_WORKER_RUNTIME is set in wrangler.jsonc vars, so CommonJS db.js takes
// the request-scoped Worker branch before these static imports are evaluated.
const workerDbContext = workerDbContextImport.default || workerDbContextImport;
const app = appImport.default || appImport;

process.env.FENOTE_WORKER_RUNTIME = 'cloudflare';
process.env.SUPABASE_URL = workerEnv.SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY = workerEnv.SUPABASE_PUBLISHABLE_KEY;
for (const key of [
  'NODE_ENV', 'DATABASE_SSL', 'PG_POOL_MAX', 'PUBLIC_API_READ_MAX',
  'PUBLIC_API_WRITE_MAX', 'CONTENT_VERSION_READ_MAX', 'SUPABASE_SECRET_KEY',
  'PUBLIC_URL', 'ADMIN_URL', 'ADMIN_APP_ORIGIN', 'ADMIN_APP_BASE_PATH',
  'ALLOWED_ORIGINS', 'UPLOAD_DIR',
]) {
  if (workerEnv[key] !== undefined) process.env[key] = workerEnv[key];
}
delete process.env.STATIC_DIR; // Worker serves static assets through ASSETS.

app.listen(3000);

function applyEnv(env) {
  // Safe inside the request handler. Never read this at module top level.
  process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
  for (const key of [
    'NODE_ENV', 'DATABASE_SSL', 'PG_POOL_MAX', 'PUBLIC_API_READ_MAX',
    'PUBLIC_API_WRITE_MAX', 'CONTENT_VERSION_READ_MAX', 'SUPABASE_SECRET_KEY',
    'PUBLIC_URL', 'ADMIN_URL', 'ADMIN_APP_ORIGIN', 'ADMIN_APP_BASE_PATH',
    'ALLOWED_ORIGINS', 'UPLOAD_DIR',
  ]) {
    if (env[key] !== undefined) process.env[key] = env[key];
  }
}

function sslConfig() {
  return process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false };
}

function closeAfterResponse(response, client, ctx) {
  const endClient = () => client.end().catch((err) => {
    console.error('Worker database client close failed:', err.message);
  });

  if (!response.body) {
    ctx.waitUntil(endClient());
    return response;
  }

  // Tee the body so the client stays alive until a streaming response (SSE)
  // has finished, but do not hold it across another request.
  const [browserBody, drainBody] = response.body.tee();
  ctx.waitUntil(
    drainBody
      .pipeTo(new WritableStream({ write() {}, abort() {}, close() {} }))
      .catch(() => {})
      .then(endClient),
  );
  return new Response(browserBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function serveAsset(request, env, pathname) {
  const assetRequest = new Request(new URL(pathname, request.url), {
    method: 'GET',
    headers: request.headers,
  });
  return env.ASSETS.fetch(assetRequest);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const needsApi =
      pathname === '/health' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/uploads/');

    if (needsApi) {
      try {
        applyEnv(env);
        const { createWorkerClient, requestDb } = workerDbContext;
        const client = createWorkerClient(env.HYPERDRIVE.connectionString, sslConfig());
        await client.connect();
        const response = await requestDb.run(client, () =>
          handleAsNodeRequest(3000, request),
        );
        return closeAfterResponse(response, client, ctx);
      } catch (error) {
        console.error('Worker API request failed:', error.message);
        return new Response(
          JSON.stringify({ success: false, message: 'Worker API unavailable' }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    // Try the real file first (index.html, /assets/*, /admin/assets/*, etc.).
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || request.method !== 'GET') {
      return assetResponse;
    }

    // BrowserRouter deep links need the correct SPA shell.
    const fallback = pathname === '/admin' || pathname.startsWith('/admin/')
      ? '/admin/index.html'
      : '/index.html';
    return serveAsset(request, env, fallback);
  },
};
