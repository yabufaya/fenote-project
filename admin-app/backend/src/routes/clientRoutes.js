const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const clientController = require('../controllers/clientController');
const upload = require('../middleware/upload');

router.get('/', clientController.getAllClients);
router.post('/', upload.single('image'), clientController.createClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;