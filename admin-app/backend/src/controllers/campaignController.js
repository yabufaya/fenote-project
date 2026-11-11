const pool = require('../db');

// Admin: subscriber-message campaigns. No external email is sent in this patch;
// creating a campaign snapshots all current subscribers into message_recipients.
exports.getCampaigns = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        count(mr.id)::int AS recipient_count,
        count(*) FILTER (WHERE mr.status = 'queued')::int AS queued_count,
        count(*) FILTER (WHERE mr.status = 'sent')::int AS sent_count
      FROM messages m
      LEFT JOIN message_recipients mr ON mr.message_id = m.id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCampaign = async (req, res) => {
  const subject = String(req.body?.subject || '').trim();
  const body = String(req.body?.body || '').trim();
  const status = req.body?.status === 'draft' ? 'draft' : 'queued';
  if (!subject || !body) {
    return res.status(400).json({ success: false, message: 'Subject and body are required' });
  }
  try {
    const messageResult = await pool.query(
      `INSERT INTO messages (subject, body, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [subject, body, status]
    );
    const message = messageResult.rows[0];

    const recipients = await pool.query(
      `INSERT INTO message_recipients (message_id, subscriber_id, email, status, created_at)
       SELECT $1, id, email, $2, NOW() FROM subscribers
       ON CONFLICT (message_id, subscriber_id) DO NOTHING`,
      [message.id, status === 'draft' ? 'draft' : 'queued']
    );

    await pool.query(
      `INSERT INTO notifications (type, title, message, is_read, related_type, related_id, created_at)
       VALUES ($1, $2, $3, FALSE, $4, $5, NOW())`,
      [
        'campaign',
        status === 'draft' ? 'Subscriber message saved' : 'Subscriber message queued',
        `"${subject}" ${status === 'draft' ? 'was saved as a draft' : 'was queued'} for ${recipients.rowCount} subscribers.`,
        'message',
        message.id,
      ]
    );

    res.status(201).json({ success: true, data: { ...message, recipient_count: recipients.rowCount } });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  const status = String(req.body?.status || '').trim();
  if (!['draft', 'queued', 'sent'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const result = await pool.query(
      `UPDATE messages SET status = $1, updated_at = NOW(),
        sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
    if (status === 'queued' || status === 'sent') {
      await pool.query(
        `UPDATE message_recipients SET status = $1, sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
         WHERE message_id = $2`,
        [status, req.params.id]
      );
      await pool.query(
        `INSERT INTO notifications (type, title, message, is_read, related_type, related_id, created_at)
         VALUES ($1, $2, $3, FALSE, $4, $5, NOW())`,
        ['campaign', 'Subscriber message updated', `"${result.rows[0].subject}" marked ${status}.`, 'message', result.rows[0].id]
      );
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
