const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
router.use(authenticateToken);
const heroController = require('../controllers/heroController');
const upload = require('../middleware/upload'); // ✅ MUST BE IMPORTED

// GET everything
router.get('/', heroController.getHeroData);

// PUT text content
router.put('/content', heroController.updateHeroContent);

// ✅ MUST HAVE upload.single('image')
router.post('/slides', upload.single('image'), heroController.createSlide);

// DELETE a slide
router.delete('/slides/:id', heroController.deleteSlide);

module.exports = router;