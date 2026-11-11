const pool = require('../db');

exports.getPayments = async (req, res) => {
  try {
    const packages = await pool.query('SELECT * FROM payment_packages ORDER BY id');
    const settings = await pool.query('SELECT * FROM payment_settings LIMIT 1');
    res.status(200).json({ success: true, data: { packages: packages.rows, settings: settings.rows[0] || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};