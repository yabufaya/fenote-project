const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Public routes
router.get('/blogs/recent', blogController.getRecentBlogs);
router.get('/blogs', blogController.getAllBlogs);
router.get('/blogs/:slug', blogController.getBlogBySlug);

module.exports = router;
