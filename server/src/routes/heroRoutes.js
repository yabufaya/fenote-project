const express = require('express');
const router = express.Router();
const heroController = require('../controllers/heroController');

router.get('/', heroController.getHeroData);

module.exports = router;