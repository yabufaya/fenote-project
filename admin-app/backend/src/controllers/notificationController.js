const pool = require('../db');

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const { type, isRead } = req.query;
    
    let query = 'SELECT * FROM notifications';
    let params = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    if (isRead !== undefined) {
      query += params.length > 0 ? ' AND is_read = $' + (params.length + 1) : ' WHERE is_read = $1';
      params.push(isRead === 'true');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE');
    
    res.status(200).json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND is_read = FALSE', [id]);
    
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await pool.query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
    
    res.status(200).json({ success: true, changed: result.rowCount, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add notification (for system alerts, content updates, etc.)
exports.addNotification = async (req, res) => {
  try {
    const { type, title, message, related_type, related_id } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({ success: false, message: 'Type, title, and message are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO notifications (type, title, message, related_type, related_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, title, message, related_type || null, related_id || null]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Add notification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};