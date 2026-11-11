const pool = require('../db');

exports.getAbout = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM about LIMIT 1');
    res.status(200).json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    console.error('Get about error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAbout = async (req, res) => {
  try {
    const {
      title1, title2, desc1, desc2, years_experience, clients_served, imageurl,
    } = req.body;
    const existing = await pool.query('SELECT id FROM about LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE about SET title1=$1, title2=$2, desc1=$3, desc2=$4, years_experience=$5, clients_served=$6, imageurl=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
        [title1, title2, desc1, desc2, years_experience, clients_served, imageurl || null, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO about (title1, title2, desc1, desc2, years_experience, clients_served, imageurl, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
        [title1, title2, desc1, desc2, years_experience, clients_served, imageurl || null]
      );
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update about error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
