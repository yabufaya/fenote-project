const pool = require('../db');

exports.getTestimonials = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM testimonial ORDER BY "created_at" DESC'
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
