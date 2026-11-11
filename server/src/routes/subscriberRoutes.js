const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');

// Public, anonymous newsletter subscribe.
router.post('/', subscriberController.createSubscriber);

module.exports = router;
