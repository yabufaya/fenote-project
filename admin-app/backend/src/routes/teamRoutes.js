const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const teamController = require('../controllers/teamController');
const upload = require('../middleware/upload');

// Get all team items
router.get('/', teamController.getAllTeam);

// Get single team item by ID
router.get('/:id', teamController.getTeamById);

// Create new team item (with optional image upload)
router.post('/', upload.single('image'), teamController.createTeam);

// Update team item (with optional image upload)
router.put('/:id', upload.single('image'), teamController.updateTeam);

// Delete team item
router.delete('/:id', teamController.deleteTeam);

module.exports = router;