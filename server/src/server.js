const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NoTimerRateLimitStore = require('./utils/noTimerRateLimitStore');
const safeClientKey = require('./utils/safeClientKey');
const path = require('path');
// Workers provide string vars through bindings; dotenv/fs is Node-local only.
if (process.env.FENOTE_WORKER_RUNTIME !== 'cloudflare') {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
  require('dotenv').config();
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Behind Render / Cloudflare / Apache, rate limiting needs the real client IP.
app.set('trust proxy', 1);

// ================= SECURITY =================
app.use(helmet({
  // Public site may load /uploads from this API's origin; allow cross-origin <img>.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const rateWindowMs = 15 * 60 * 1000; // 15 mins
const readMax = positiveInt(process.env.PUBLIC_API_READ_MAX, 1000);
const writeMax = positiveInt(process.env.PUBLIC_API_WRITE_MAX, 100);
const versionReadMax = positiveInt(process.env.CONTENT_VERSION_READ_MAX, 3000);

// Public content GETs are numerous: the SPA loads ~15 sections and a shared
// Realtime/polling fallback refetches them. Give reads generous headroom while
// keeping strict limits on bookings, messages and subscriber writes.
const isRead = (req) =>
  req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
const isVersionRead = (req) => {
  const path = req.originalUrl.split('?')[0];
  return req.method === 'GET' && (path === '/api/content-version' || path === '/api/content-version/');
};

// The tiny version check is deliberately separate from the content-read
// limiter: one visible tab polls it every few seconds, then refetches only
// changed sections. It returns no row data, only a PII-free hash/stamps.
const versionLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: versionReadMax,
  store: new NoTimerRateLimitStore(),
  keyGenerator: safeClientKey,
  skip: (req) => !isVersionRead(req),
  message: 'Too many content version checks from this IP.',
  standardHeaders: true,
  legacyHeaders: false,
});
const readLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: readMax,
  store: new NoTimerRateLimitStore(),
  keyGenerator: safeClientKey,
  skip: (req) => !isRead(req) || isVersionRead(req),
  message: 'Too many public content requests from this IP.',
  standardHeaders: true,
  legacyHeaders: false,
});
const writeLimiter = rateLimit({
  windowMs: rateWindowMs,
  max: writeMax,
  store: new NoTimerRateLimitStore(),
  keyGenerator: safeClientKey,
  skip: (req) => isRead(req),
  message: 'Too many write requests from this IP.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', versionLimiter);
app.use('/api/', readLimiter);
app.use('/api/', writeLimiter);

// Dynamic API reads must never be served from an HTTP cache or a stale 304.
// The database is the source of truth; each GET must reach the Worker.
app.use('/api/', (req, res, next) => {
  if (isRead(req)) {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

const localhostOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
];
const productionOrigins = [process.env.PUBLIC_URL, process.env.ADMIN_URL].filter(Boolean);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : (isProduction && productionOrigins.length ? productionOrigins : localhostOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

// Overlay EN / AM database content on public GET responses. The admin API is
// intentionally not localized so editors can see and update raw translations.
app.use('/api/', require('./middleware/localize'));

// ================= HEALTH CHECK (Render / uptime monitors) =================
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'public-api' }));

// ================= IMAGE SERVING =================
// Use an absolute persistent path in production (UPLOAD_DIR).
// The relative fallback only works while this monorepo layout is intact.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../../admin-app/backend/public/uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ================= ROUTES =================
// Lightweight change stamp used by the live-refresh fallback.
app.use('/api/content-version', require('./routes/contentVersionRoutes'));
app.use('/api/team', require('./routes/teamRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/highlight', require('./routes/highlightRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/subscribers', require('./routes/subscriberRoutes'));
app.use('/api/messages', require('./routes/contactMessageRoutes'));
app.use('/api/hero', require('./routes/heroRoutes'));
app.use('/api/about', require('./routes/aboutRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// ================= OPTIONAL: SERVE THE PUBLIC SPA FROM THIS PROCESS =================
// Set STATIC_DIR to fenote-app/dist if you want one origin instead of a separate static host.
if (process.env.STATIC_DIR) {
  const dist = path.resolve(process.env.STATIC_DIR);
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(dist, 'index.html'));
    }
    next();
  });
}

// ================= START SERVER =================
// Export the app so a Cloudflare Worker entry can mount it via httpServerHandler.
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PUBLIC_API_PORT || process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Public API running on port ${PORT}`));
}
