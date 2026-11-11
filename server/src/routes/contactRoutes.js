// contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
router.get('/', contactController.getContact);
module.exports = router;