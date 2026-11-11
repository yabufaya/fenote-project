// express-rate-limit's default keyGenerator reads req.ip, whose validation
// getter throws ERR_ERL_UNDEFINED_IP_ADDRESS in Cloudflare Workers. Use the
// proxy headers already present on the Node HTTP bridge instead.
const { ipKeyGenerator } = require('express-rate-limit');

function safeClientKey(req) {
  const header = req?.headers?.['cf-connecting-ip'] || req?.headers?.['x-forwarded-for'];
  const raw = Array.isArray(header) ? header[0] : String(header || '').split(',')[0].trim();
  const fallback = req?.socket?.remoteAddress || '127.0.0.1';
  return ipKeyGenerator(raw || fallback || '127.0.0.1');
}

module.exports = safeClientKey;
