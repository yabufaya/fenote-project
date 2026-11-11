const isWorkerRuntime = process.env.FENOTE_WORKER_RUNTIME === 'cloudflare';

if (isWorkerRuntime) {
  // Workers cannot keep a global LISTEN connection, clients Set or timers.
  // Each SSE request uses its own request-scoped pg.Client and local listeners;
  // closeAfterResponse() in the Worker entry closes that client when the stream
  // ends. Hyperdrive owns the underlying database connections.
  const { getRequestClient } = require('../../../../server/src/workerDbContext');

  function writeEvent(res, event, data) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (_) { /* stream already closed */ }
  }

  function addClient(res, req) {
    const client = getRequestClient();
    let heartbeat = null;
    let closed = false;

    const onNotification = (msg) => {
      if (msg.channel !== 'fenote_admin_events') return;
      let event;
      try { event = JSON.parse(msg.payload); } catch (_) { return; }
      // Payloads contain only table/action/id/status flags. Never patient data.
      writeEvent(res, 'adminEvent', event);
    };
    const onError = (err) => {
      console.error('Worker admin LISTEN connection lost:', err.message);
      cleanup();
    };
    const onEnd = () => cleanup();

    function cleanup() {
      if (closed) return;
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      client.removeListener?.('notification', onNotification);
      client.removeListener?.('error', onError);
      client.removeListener?.('end', onEnd);
      // Do not end the client here: the Worker keeps it alive until the
      // streaming response body is drained, then closes it with waitUntil().
    }

    client.on('notification', onNotification);
    client.on('error', onError);
    client.on('end', onEnd);
    client.query('LISTEN fenote_admin_events').catch((err) => {
      console.error('Worker admin LISTEN failed:', err.message);
      cleanup();
    });

    heartbeat = setInterval(() => {
      try { res.write(': keep-alive\n\n'); } catch (_) { cleanup(); }
    }, 25000);
    if (heartbeat.unref) heartbeat.unref();

    req?.on?.('close', cleanup);
    res?.on?.('close', cleanup);
    return cleanup;
  }

  module.exports = {
    addClient,
    broadcast: () => {},
    ensureListening: () => {},
  };
} else {
  const pool = require('../db');

  // Authenticated admin SSE bridge.
  //
  // Database triggers publish small, PII-free payloads on `fenote_admin_events`
  // after booking/message/notification changes. One dedicated pooled connection
  // LISTENs here and fans those events out to all signed-in admin browsers. This
  // replaces the old 2-second notifications-table poller and also works when the
  // insert came from the other Express process (:5000 or :5001).
  const clients = new Set();
  let listener = null;
  let listening = false;
  let reconnectTimer = null;
  let heartbeat = null;

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (_) {
        clients.delete(res);
      }
    }
  }

  function stopHeartbeat() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  }

  function ensureHeartbeat() {
    if (heartbeat || clients.size === 0) return;
    heartbeat = setInterval(() => {
      for (const res of clients) {
        try { res.write(': keep-alive\n\n'); } catch (_) { clients.delete(res); }
      }
      if (clients.size === 0) stopHeartbeat();
    }, 25000);
    if (heartbeat.unref) heartbeat.unref();
  }

  function scheduleReconnect() {
    if (reconnectTimer || clients.size === 0) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (clients.size > 0) ensureListening();
    }, 1500);
    if (reconnectTimer.unref) reconnectTimer.unref();
  }

  function releaseListener(err) {
    const client = listener;
    listener = null;
    listening = false;
    if (client) {
      try { client.release(err || true); } catch (_) { /* already released */ }
    }
    if (err) console.error('Admin LISTEN connection lost:', err.message);
    scheduleReconnect();
  }

  async function ensureListening() {
    if (listening || clients.size === 0) return;
    listening = true;
    try {
      const client = await pool.connect();
      listener = client;
      client.on('notification', (msg) => {
        if (msg.channel !== 'fenote_admin_events') return;
        let event;
        try { event = JSON.parse(msg.payload); } catch (_) { return; }
        // Payloads contain only table/action/id/status flags. Never patient data.
        broadcast('adminEvent', event);
      });
      client.on('error', releaseListener);
      client.on('end', () => releaseListener());
      await client.query('LISTEN fenote_admin_events');
    } catch (err) {
      releaseListener(err);
    }
  }

  function addClient(res) {
    clients.add(res);
    ensureHeartbeat();
    ensureListening();
    return () => {
      clients.delete(res);
      if (clients.size === 0) {
        stopHeartbeat();
        releaseListener();
      }
    };
  }

  module.exports = { addClient, broadcast, ensureListening };
}
