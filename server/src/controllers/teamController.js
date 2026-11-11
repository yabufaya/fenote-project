const pool = require('../db');

exports.getTeam = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM team ORDER BY "order" ASC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
