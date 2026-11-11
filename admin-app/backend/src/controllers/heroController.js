const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// ✅ GET: Fetches both text content and slides in one call
exports.getHeroData = async (req, res) => {
  try {
    const contentRes = await pool.query('SELECT * FROM hero_content LIMIT 1');
    const slidesRes = await pool.query('SELECT * FROM hero_slide ORDER BY created_at ASC');
    
    res.status(200).json({ 
      success: true, 
      data: {
        content: contentRes.rows[0] || {},
        slides: slidesRes.rows
      }
    });
  } catch (error) {
    console.error('Get hero error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ PUT: Updates the text content
exports.updateHeroContent = async (req, res) => {
  try {
    const { title1, title2, desc1, desc2, desc3 } = req.body;
    const existing = await pool.query('SELECT id FROM hero_content LIMIT 1');
    
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE hero_content SET title1=$1, title2=$2, desc1=$3, desc2=$4, desc3=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
        [title1, title2, desc1, desc2, desc3, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO hero_content (title1, title2, desc1, desc2, desc3, updated_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
        [title1, title2, desc1, desc2, desc3]
      );
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update hero content error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ POST: Uploads a new carousel image
exports.createSlide = async (req, res) => {
  try {
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'carousel' });
    if (!imageurl) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    const result = await pool.query(
      `INSERT INTO hero_slide (imageurl, created_at) VALUES ($1, NOW()) RETURNING *`,
      [imageurl]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create slide error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ DELETE: Removes a carousel image
exports.deleteSlide = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM hero_slide WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }
    res.status(200).json({ success: true, message: 'Slide deleted successfully' });
  } catch (error) {
    console.error('Delete slide error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};