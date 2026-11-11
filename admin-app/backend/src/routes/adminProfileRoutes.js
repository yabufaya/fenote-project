const express = require('express');
const rateLimit = require('express-rate-limit');
const NoTimerRateLimitStore = require('../utils/noTimerRateLimitStore');
const safeClientKey = require('../utils/safeClientKey');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/authMiddleware');
const controller = require('../controllers/adminProfileController');

// Invite emails are sent only by an authenticated superadmin to an existing
// active admin_profiles row. Limit resends per client + profile id.
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  store: new NoTimerRateLimitStore(),
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${safeClientKey(req)}:${req.params.id || 'none'}`,
  message: { success: false, message: 'Too many invitation attempts. Try again later.' },
});

router.get('/me', authenticateToken, controller.getMe);
router.get('/', authenticateToken, requireSuperadmin, controller.list);
router.post('/', authenticateToken, requireSuperadmin, controller.create);
router.post('/:id/invite', authenticateToken, requireSuperadmin, inviteLimiter, controller.resendInvite);
router.put('/:id', authenticateToken, requireSuperadmin, controller.update);
router.delete('/:id', authenticateToken, requireSuperadmin, controller.remove);

module.exports = router;
