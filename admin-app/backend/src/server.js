const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NoTimerRateLimitStore = require('./utils/noTimerRateLimitStore');
const safeClientKey = require('./utils/safeClientKey');
const path = require('path');
// Workers provide string vars through bindings; dotenv/fs is Node-local only.
if (process.env.FENOTE_WORKER_RUNTIME !== 'cloudflare') {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });
  require('dotenv').config();
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Required for Render / Cloudflare / Apache so rate limiting uses the real client IP.
app.set('trust proxy', 1);

// ================= SECURITY =================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Login is handled entirely by Supabase Auth; its own rate limiting / CAPTCHA
// applies. There is no local /api/auth/login endpoint anymore.
const isVersionRead = (req) => {
  const path = req.originalUrl.split('?')[0];
  return req.method === 'GET' && (
    path === '/api/content-version' ||
    path === '/api/content-version/' ||
    path === '/api/admin/content-version' ||
    path === '/api/admin/content-version/'
  );
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  store: new NoTimerRateLimitStore(),
  max: isProduction ? 300 : 5000,
  keyGenerator: safeClientKey,
  skip: (req) => isVersionRead(req),
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// One content-version poll per visible tab is cheaper than refetching every
// section. Keep it outside the general admin limiter but give it its own cap.
const versionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  store: new NoTimerRateLimitStore(),
  max: isProduction ? 3000 : 5000,
  keyGenerator: safeClientKey,
  skip: (req) => !isVersionRead(req),
  message: { success: false, message: 'Too many content version checks.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', versionLimiter);
app.use('/api/', apiLimiter);

const localhostOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
];
const productionOrigins = [process.env.ADMIN_URL, process.env.PUBLIC_URL].filter(Boolean);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : (isProduction && productionOrigins.length ? productionOrigins : localhostOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'admin-api' }));

// ================= IMAGE SERVING =================
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '../public/uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ================= ROUTES =================
// Same PII-free change stamp as the public API. In the one-Worker build this
// is reached at /api/admin/content-version; locally at /api/content-version.
app.use('/api/content-version', require('../../../server/src/routes/contentVersionRoutes'));
// No /api/auth: login, logout, reset and sessions are Supabase Auth.
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/team-members', require('./routes/teamMembersRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/highlights', require('./routes/highlightRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/hero', require('./routes/heroRoutes'));
app.use('/api/about', require('./routes/aboutRoutes'));
app.use('/api/translations', require('./routes/contentTranslationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/subscribers', require('./routes/subscriberRoutes'));
app.use('/api/messages', require('./routes/contactMessageRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/admins', require('./routes/adminProfileRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/booking-availability', require('./routes/bookingAvailabilityRoutes'));

// ================= OPTIONAL: SERVE THE ADMIN SPA FROM THIS PROCESS =================
// Set STATIC_DIR to admin-app/frontend/dist if you want one origin.
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
  const PORT = process.env.ADMIN_API_PORT || process.env.PORT || 5001;
  app.listen(PORT, '0.0.0.0', () => console.log(`Admin API running on port ${PORT}`));
}
