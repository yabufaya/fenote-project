const pool = require('../db');

exports.getPayments = async (req, res) => {
  try {
    const packages = await pool.query('SELECT * FROM payment_packages ORDER BY id');
    const settings = await pool.query('SELECT * FROM payment_settings LIMIT 1');
    res.status(200).json({ success: true, data: { packages: packages.rows, settings: settings.rows[0] || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePaymentPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, price, registration_fee } = req.body;
    const result = await pool.query(
      `UPDATE payment_packages SET duration=$1, price=$2, registration_fee=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [duration, price, registration_fee, id]
    );
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const { cbe_account, cbe_swift, telebirr_account } = req.body;
    const existing = await pool.query('SELECT id FROM payment_settings LIMIT 1');
    
    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE payment_settings SET cbe_account=$1, cbe_swift=$2, telebirr_account=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
        [cbe_account, cbe_swift, telebirr_account, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO payment_settings (cbe_account, cbe_swift, telebirr_account, updated_at) VALUES ($1,$2,$3,NOW()) RETURNING *`,
        [cbe_account, cbe_swift, telebirr_account]
      );
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};