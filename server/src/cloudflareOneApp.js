// Combined Express app for ONE Cloudflare Worker / Static Assets deployment.
// Public API stays at /api/*; admin API is mounted at /api/admin/*.
//
// This file lives beside server/src/server.js so `express` and other backend
// dependencies resolve from server/node_modules during Wrangler bundling.
const express = require('express');
const publicApp = require('./server.js');
const adminApp = require('../../admin-app/backend/src/server.js');

const app = express();
app.set('trust proxy', 1);

// Same-origin health check for the single Worker.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'fenote-one-app' }));

// /api/admin/bookings -> adminApp sees /api/bookings.
app.use('/api/admin', (req, res, next) => {
  req.url = `/api${req.url}`;
  adminApp(req, res, next);
});

// /api/hero -> publicApp sees /api/hero.
app.use('/', publicApp);

module.exports = app;
