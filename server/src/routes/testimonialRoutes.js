const express = require('express');
const router = express.Router();
const { getTestimonials } = require('../controllers/testimonialController');

// GET /api/testimonials
router.get('/', getTestimonials);

module.exports = router;