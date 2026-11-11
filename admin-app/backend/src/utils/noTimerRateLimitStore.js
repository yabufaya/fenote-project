// express-rate-limit store without setInterval/clearInterval. Workers forbid
// timers at module/global scope, so expired keys are pruned lazily inside a
// request instead. This keeps Node behaviour and local rate limiting intact.
class NoTimerRateLimitStore {
  constructor() {
    this.clients = new Map();
    this.windowMs = 15 * 60 * 1000;
    this.localKeys = true;
  }

  init(options) {
    if (options?.windowMs) this.windowMs = options.windowMs;
  }

  prune(now) {
    for (const [key, client] of this.clients) {
      if (client.resetTime.getTime() <= now) this.clients.delete(key);
    }
  }

  async get(key) {
    return this.clients.get(key);
  }

  async increment(key) {
    const now = Date.now();
    this.prune(now);
    let client = this.clients.get(key);
    if (!client || client.resetTime.getTime() <= now) {
      client = { totalHits: 0, resetTime: new Date(now + this.windowMs) };
      this.clients.set(key, client);
    }
    client.totalHits += 1;
    return client;
  }

  async decrement(key) {
    const client = this.clients.get(key);
    if (client && client.totalHits > 0) client.totalHits -= 1;
  }

  async resetKey(key) {
    this.clients.delete(key);
  }

  async resetAll() {
    this.clients.clear();
  }

  shutdown() {
    this.clients.clear();
  }
}

module.exports = NoTimerRateLimitStore;
module.exports.NoTimerRateLimitStore = NoTimerRateLimitStore;
