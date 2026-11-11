const pool = require('../db');

exports.getAbout = async (req, res) => {
  try {
    const aboutRes = await pool.query('SELECT * FROM about LIMIT 1');
    const serviceCountRes = await pool.query('SELECT COUNT(*) FROM services');
    
    const data = aboutRes.rows[0] || {};
    data.services_count = parseInt(serviceCountRes.rows[0].count) || 0;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get about error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};