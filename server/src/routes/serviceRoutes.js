const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Public route to get all services
router.get('/', serviceController.getAllServices);

module.exports = router;