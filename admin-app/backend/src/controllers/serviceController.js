const pool = require('../db');

exports.getAllServices = async (req, res) => {
  try {
    // Order by the "order" column first, then by newest
    const result = await pool.query('SELECT * FROM services ORDER BY "order" ASC, created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createService = async (req, res) => {
  try {
    const { title, description, category, order } = req.body;
    const result = await pool.query(
      `INSERT INTO services (title, description, category, "order", created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [title, description, category || 'training', order || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, order } = req.body;

    const existing = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const result = await pool.query(
      `UPDATE services 
       SET title = $1, description = $2, category = $3, "order" = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title, description, category || 'training', order || 0, id]
    );
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};