const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const highlightController = require('../controllers/highlightController');
const upload = require('../middleware/upload');

// Get all highlights
router.get('/', highlightController.getAllHighlights);

// Get single highlight by ID
router.get('/:id', highlightController.getHighlightById);

// Create new highlight (with optional image upload)
router.post('/', upload.single('image'), highlightController.createHighlight);

// Update highlight (with optional image upload)
router.put('/:id', upload.single('image'), highlightController.updateHighlight);

// Delete highlight
router.delete('/:id', highlightController.deleteHighlight);

module.exports = router;