const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const controller = require('../controllers/paymentController');

router.get('/', controller.getPayments);
router.put('/package/:id', controller.updatePaymentPackage);
router.put('/settings', controller.updatePaymentSettings);

module.exports = router;