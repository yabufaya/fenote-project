const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// Get all highlights
exports.getAllHighlights = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM highlight ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all highlights error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single highlight by ID
exports.getHighlightById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM highlight WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get highlight by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new highlight
exports.createHighlight = async (req, res) => {
  try {
    const { title, description, category, read_more_link } = req.body;
    
    // Build image_url from the uploaded file
    const image_url = resolveAsset(req, { field: 'image', bodyKey: 'image_url', section: 'highlights' }) || '';
    
    const result = await pool.query(
      `INSERT INTO highlight (title, description, image_url, category, read_more_link, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title, description, image_url, category || '', read_more_link || '']
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create highlight error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update highlight
exports.updateHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, read_more_link } = req.body;
    
    // Get existing highlight to keep old image_url if no new file is uploaded
    const existing = await pool.query('SELECT * FROM highlight WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    // Use new file if uploaded, otherwise keep existing image_url
    const image_url = resolveAsset(req, { field: 'image', bodyKey: 'image_url', section: 'highlights' }) || existing.rows[0].image_url;
    
    const result = await pool.query(
      `UPDATE highlight 
       SET title = $1, description = $2, image_url = $3, category = $4, read_more_link = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description, image_url, category || '', read_more_link || '', id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update highlight error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete highlight
exports.deleteHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM highlight WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }
    
    res.status(200).json({ success: true, message: 'Highlight deleted successfully' });
  } catch (error) {
    console.error('Delete highlight error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};