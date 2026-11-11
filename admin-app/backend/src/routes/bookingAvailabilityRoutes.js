const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const controller = require('../controllers/bookingAvailabilityController');

router.use(authenticateToken);
router.get('/', controller.getAvailability);
router.put('/', controller.updateAvailability);

module.exports = router;
