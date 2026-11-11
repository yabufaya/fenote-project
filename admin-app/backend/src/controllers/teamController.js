const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// Get all team items
exports.getAllTeam = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM team ORDER BY "order" ASC, created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single team item by ID
exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM team WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team item not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new team item
exports.createTeam = async (req, res) => {
  try {
    const { name, role, description, bordercolor, textcolor, order } = req.body;
    
    // Build imageurl from the uploaded file
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'team' }) || '';
    
    const result = await pool.query(
      `INSERT INTO team (name, role, description, imageurl, bordercolor, textcolor, "order", created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [name, role, description, imageurl, bordercolor || 'border-fenote-500', textcolor || 'text-accent', order || 0]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update team item
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, description, bordercolor, textcolor, order } = req.body;
    
    // Get existing item to keep old imageurl if no new file is uploaded
    const existing = await pool.query('SELECT * FROM team WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team item not found' });
    }

    // Use new file if uploaded, otherwise keep existing imageurl
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'team' }) || existing.rows[0].imageurl;
    
    const result = await pool.query(
      `UPDATE team 
       SET name = $1, role = $2, description = $3, imageurl = $4, bordercolor = $5, textcolor = $6, "order" = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, role, description, imageurl, bordercolor || 'border-fenote-500', textcolor || 'text-accent', order || 0, id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete team item
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM team WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team item not found' });
    }
    
    res.status(200).json({ success: true, message: 'Team item deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};