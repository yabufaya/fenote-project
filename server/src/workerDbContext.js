// Request-scoped database context for the Cloudflare Worker build.
//
// Cloudflare Workers must not open or reuse database I/O in global scope. One
// pg.Client is created per API request and stored in AsyncLocalStorage so the
// existing Express controllers can keep calling pool.query()/pool.connect().
// Hyperdrive owns the real connection pool [Workers best practices].
const { AsyncLocalStorage } = require('node:async_hooks');
const { Client } = require('pg');

const requestDb = new AsyncLocalStorage();

function getRequestClient() {
  const client = requestDb.getStore();
  if (!client) {
    throw new Error('Worker database client is missing from this request context');
  }
  return client;
}

function createWorkerClient(connectionString, ssl) {
  return new Client({ connectionString, ssl });
}

module.exports = { requestDb, getRequestClient, createWorkerClient };
