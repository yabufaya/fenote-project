const pool = require('../db');

exports.getContactMessages = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE id = $1 AND is_read = FALSE', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark contact message read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const result = await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE is_read = FALSE');
    res.status(200).json({ success: true, changed: result.rowCount });
  } catch (error) {
    console.error('Mark all contact messages read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteContactMessage = async (req, res) => {
  try {
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
