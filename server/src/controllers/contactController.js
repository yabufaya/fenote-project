const pool = require('../db');

exports.getContact = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact LIMIT 1');
    res.status(200).json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};