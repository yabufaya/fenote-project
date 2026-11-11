const pool = require('../db');

exports.getAllServices = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY "order" ASC, created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};