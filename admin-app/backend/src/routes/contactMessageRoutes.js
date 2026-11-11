const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const contactMessageController = require('../controllers/contactMessageController');

router.use(authenticateToken);
router.get('/', contactMessageController.getContactMessages);
router.put('/read-all', contactMessageController.markAllAsRead);
router.put('/:id/read', contactMessageController.markAsRead);
router.delete('/:id', contactMessageController.deleteContactMessage);

module.exports = router;
