const pool = require('../db');

// GET: Fetches both text content and carousel slides in one call
exports.getHeroData = async (req, res) => {
  try {
    const contentRes = await pool.query('SELECT * FROM hero_content ORDER BY id ASC LIMIT 1');
    const slidesRes = await pool.query('SELECT * FROM hero_slide ORDER BY created_at ASC, id ASC');
    
    res.status(200).json({ 
      success: true, 
      data: {
        content: contentRes.rows[0] || {},
        slides: slidesRes.rows
      }
    });
  } catch (error) {
    console.error('Get hero error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};