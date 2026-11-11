const express = require('express');
const router = express.Router();
const { getResources } = require('../controllers/resourceController');

// GET /api/resources
router.get('/', getResources);

module.exports = router;