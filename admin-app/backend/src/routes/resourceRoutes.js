const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const resourceController = require('../controllers/resourceController');
const upload = require('../middleware/upload');

// Get all resources
router.get('/', resourceController.getAllResources);

// Get single resource
router.get('/:id', resourceController.getResourceById);

// ✅ CHANGED: Use upload.fields to handle BOTH image and pdf uploads
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), resourceController.createResource);

router.put('/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), resourceController.updateResource);

// Delete resource
router.delete('/:id', resourceController.deleteResource);

module.exports = router;