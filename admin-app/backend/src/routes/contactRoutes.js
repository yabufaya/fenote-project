const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const contactController = require('../controllers/contactController');

router.get('/', contactController.getContact);
router.put('/', contactController.updateContact); // No upload needed here

module.exports = router;