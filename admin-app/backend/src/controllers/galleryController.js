const pool = require('../db');
const { resolveAsset, directAssetUrl } = require('../utils/assetUrl');

// Get all gallery items
exports.getAllGallery = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gallery ORDER BY created_at DESC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all gallery error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single gallery item by ID
exports.getGalleryItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM gallery WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get gallery item by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new gallery item
exports.createGalleryItem = async (req, res) => {
  try {
    const { altText, category } = req.body;
    const videoUrl = directAssetUrl(req.body.video_url) || null;
    
    // Build imageurl from the uploaded file
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'gallery' }) || '';
    
    const result = await pool.query(
      `INSERT INTO gallery (imageurl, alttext, category, video_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [imageurl, altText || '', category || '', videoUrl]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create gallery item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update gallery item
exports.updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { altText, category } = req.body;
    const videoUrl = directAssetUrl(req.body.video_url) || null;
    
    // Get existing item to keep old imageurl if no new file is uploaded
    const existing = await pool.query('SELECT * FROM gallery WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }

    // Use new file if uploaded, otherwise keep existing imageurl
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'gallery' }) || existing.rows[0].imageurl;
    
    const result = await pool.query(
      `UPDATE gallery 
       SET imageurl = $1, alttext = $2, category = $3, video_url = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [imageurl, altText || '', category || '', videoUrl || existing.rows[0].video_url || null, id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update gallery item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete gallery item
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM gallery WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery item not found' });
    }
    
    res.status(200).json({ success: true, message: 'Gallery item deleted successfully' });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};