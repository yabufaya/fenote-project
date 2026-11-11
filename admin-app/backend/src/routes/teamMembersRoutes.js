const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const teamMembersController = require('../controllers/teamMembersController');
const upload = require('../middleware/upload');

// Get all team members
router.get('/', teamMembersController.getAllTeamMembers);

// Get single team member by ID
router.get('/:id', teamMembersController.getTeamMemberById);

// Create new team member (with optional image upload)
router.post('/', upload.single('image'), teamMembersController.createTeamMember);

// Update team member (with optional image upload)
router.put('/:id', upload.single('image'), teamMembersController.updateTeamMember);

// Delete team member
router.delete('/:id', teamMembersController.deleteTeamMember);

module.exports = router;