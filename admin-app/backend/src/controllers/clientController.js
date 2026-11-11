const pool = require('../db');
const { resolveAsset } = require('../utils/assetUrl');

exports.getAllClients = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM client ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createClient = async (req, res) => {
  try {
    const { name } = req.body;
    const imageurl = resolveAsset(req, { field: 'image', bodyKey: 'imageurl', section: 'clients' }) || '';

    const result = await pool.query(
      `INSERT INTO client (name, imageurl, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
      [name, imageurl]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM client WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.status(200).json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};