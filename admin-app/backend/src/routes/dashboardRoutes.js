const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes are protected
router.use(authenticateToken);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/booking-stats', dashboardController.getBookingStats);

module.exports = router;