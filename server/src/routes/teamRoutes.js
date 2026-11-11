const express = require('express');
const router = express.Router();
const { getTeam } = require('../controllers/teamController');

// GET /api/team
router.get('/', getTeam);

module.exports = router;