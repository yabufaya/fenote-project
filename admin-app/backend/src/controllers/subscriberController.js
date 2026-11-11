const pool = require('../db');

// Admin: total subscribers + email list for the Subscribers page.
exports.getSubscribers = async (req, res) => {
  try {
    const [list, stats] = await Promise.all([
      pool.query('SELECT id, email, created_at FROM subscribers ORDER BY created_at DESC'),
      pool.query(`SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE created_at::date = current_date)::int AS today,
          count(*) FILTER (WHERE created_at >= current_date - interval '7 days')::int AS week
        FROM subscribers`),
    ]);
    res.status(200).json({ success: true, data: list.rows, stats: stats.rows[0] });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteSubscriber = async (req, res) => {
  try {
    await pool.query('DELETE FROM subscribers WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true, message: 'Subscriber removed' });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
