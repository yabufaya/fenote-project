const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

// Get all team members
exports.getAllTeamMembers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM team_members ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all team members error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single team member by ID
exports.getTeamMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM team_members WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get team member by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new team member
exports.createTeamMember = async (req, res) => {
  try {
    const { name, role, bio } = req.body;
    
    // Build imageurl from the uploaded file
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'team' }) || '';
    
    const result = await pool.query(
      `INSERT INTO team_members (name, role, bio, imageurl, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, role, bio, imageurl]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create team member error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update team member
exports.updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, bio } = req.body;
    
    // Get existing member to keep old imageurl if no new file is uploaded
    const existing = await pool.query('SELECT * FROM team_members WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    // Use new file if uploaded, otherwise keep existing imageurl
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'team' }) || existing.rows[0].imageurl;
    
    const result = await pool.query(
      `UPDATE team_members 
       SET name = $1, role = $2, bio = $3, imageurl = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, role, bio, imageurl, id]
    );
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete team member
exports.deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM team_members WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    
    res.status(200).json({ success: true, message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};