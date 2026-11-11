const pool = require('../db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public contact form. The row stays private; a generic notification and a
// PII-free DB trigger event drive the authenticated admin SSE stream.
exports.createContactMessage = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim();

  if (!name || !EMAIL_RE.test(email) || !message) {
    return res.status(400).json({ success: false, message: 'Name, valid email and message are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO contact_messages (name, email, message, is_read, created_at)
       VALUES ($1, $2, $3, FALSE, NOW()) RETURNING id, created_at`,
      [name, email, message]
    );
    const row = result.rows[0];

    await pool.query(
      `INSERT INTO notifications (type, title, message, is_read, related_type, related_id, created_at)
       VALUES ($1, $2, $3, FALSE, $4, $5, NOW())`,
      ['message', 'New contact message', 'A new website message is waiting for review.', 'contact_message', row.id]
    );

    // Reflect only a receipt id; never echo the sender's details back.
    res.status(201).json({ success: true, data: { id: row.id, created_at: row.created_at } });
  } catch (error) {
    console.error('Create contact message error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not send message' });
  }
};
