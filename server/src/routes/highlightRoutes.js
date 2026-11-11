const express = require('express');
const router = express.Router();
const highlightController = require('../controllers/highlightController');

// Public routes
router.get('/highlight', highlightController.getHighlight);

module.exports = router;