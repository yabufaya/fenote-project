const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// Get all resources
exports.getAllResources = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resource ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single resource by ID
exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM resource WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new resource
exports.createResource = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'resources' }) || '';
    const downloadurl = resolveAsset(req, { field: 'pdf', bodyKey: 'downloadurl', section: 'resources' }) || '';
    
    const result = await pool.query(
      `INSERT INTO resource (title, description, category, imageurl, downloadurl, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title, description || '', category || '', imageurl, downloadurl]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update resource
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;
    
    // Get existing item to keep old files if no new ones are uploaded
    const existing = await pool.query('SELECT * FROM resource WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'resources' }) || existing.rows[0].imageurl;
    const downloadurl = resolveAsset(req, { field: 'pdf', bodyKey: 'downloadurl', section: 'resources' }) || existing.rows[0].downloadurl;
    
    const result = await pool.query(
      `UPDATE resource 
       SET title = $1, description = $2, category = $3, imageurl = $4, downloadurl = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, description || '', category || '', imageurl, downloadurl, id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete resource
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM resource WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};