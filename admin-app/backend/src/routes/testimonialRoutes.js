const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const testimonialController = require('../controllers/testimonialController');
const upload = require('../middleware/upload');

// Get all testimonials
router.get('/', testimonialController.getAllTestimonials);

// Get single testimonial by ID
router.get('/:id', testimonialController.getTestimonialById);

// Create new testimonial (with optional image upload)
router.post('/', upload.single('image'), testimonialController.createTestimonial);

// Update testimonial (with optional image upload)
router.put('/:id', upload.single('image'), testimonialController.updateTestimonial);

// Delete testimonial
router.delete('/:id', testimonialController.deleteTestimonial);

module.exports = router;