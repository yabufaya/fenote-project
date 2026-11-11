const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const galleryController = require('../controllers/galleryController');
const upload = require('../middleware/upload');

// Get all gallery items
router.get('/', galleryController.getAllGallery);

// Get single gallery item by ID
router.get('/:id', galleryController.getGalleryItemById);

// Create new gallery item (with optional image upload)
router.post('/', upload.single('image'), galleryController.createGalleryItem);

// Update gallery item (with optional image upload)
router.put('/:id', upload.single('image'), galleryController.updateGalleryItem);

// Delete gallery item
router.delete('/:id', galleryController.deleteGalleryItem);

module.exports = router;