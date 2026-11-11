const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const blogController = require('../controllers/blogController');
const upload = require('../middleware/upload');

// Get all blogs
router.get('/', blogController.getAllBlogs);

// Get single blog by ID
router.get('/:id', blogController.getBlogById);

// Create new blog (with optional image upload)
router.post('/', upload.single('image'), blogController.createBlog);

// Update blog (with optional image upload)
router.put('/:id', upload.single('image'), blogController.updateBlog);

// Delete blog
router.delete('/:id', blogController.deleteBlog);

module.exports = router;