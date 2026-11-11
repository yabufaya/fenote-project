const express = require('express');
const router = express.Router();
const { getGallery } = require('../controllers/galleryController');

// GET /api/gallery
router.get('/', getGallery);

module.exports = router;