const pool = require('../db');

// Get the single highlight
exports.getHighlight = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM highlight ORDER BY "created_at" DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};