const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const subscriberController = require('../controllers/subscriberController');

router.use(authenticateToken);
router.get('/', subscriberController.getSubscribers);
router.delete('/:id', subscriberController.deleteSubscriber);

module.exports = router;
