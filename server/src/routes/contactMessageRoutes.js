const express = require('express');
const router = express.Router();
const contactMessageController = require('../controllers/contactMessageController');

// Public, anonymous contact message.
router.post('/', contactMessageController.createContactMessage);

module.exports = router;
