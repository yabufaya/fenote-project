const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const aboutController = require('../controllers/aboutController');

router.get('/', aboutController.getAbout);
router.put('/', aboutController.updateAbout);

module.exports = router;