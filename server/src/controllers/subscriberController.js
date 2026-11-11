const pool = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public newsletter subscribe. Email-only; duplicates are silently ignored.
exports.createSubscriber = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Valid email required' });
  }
  try {
    await pool.query(
      'INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    res.status(201).json({ success: true, message: 'Subscribed' });
  } catch (error) {
    console.error('Create subscriber error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
