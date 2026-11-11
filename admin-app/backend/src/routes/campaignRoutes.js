const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const campaignController = require('../controllers/campaignController');

router.use(authenticateToken);
router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.put('/:id/status', campaignController.updateCampaignStatus);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
