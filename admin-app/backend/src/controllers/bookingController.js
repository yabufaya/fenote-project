const pool = require('../db');
const sseHub = require('../utils/sseHub');

async function expireStaleHolds() {
  await pool.query('select public.expire_pending_bookings()');
}

// Get all bookings (admin-only; patient details stay behind the protected API).
exports.getAllBookings = async (_req, res) => {
  try {
    await expireStaleHolds();
    const result = await pool.query(
      `SELECT * FROM bookings
       ORDER BY slot_start DESC NULLS LAST, created_at DESC, id DESC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all bookings error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get booking by ID error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Confirm keeps the slot blocked; deny/cancel/expire release it via DB trigger.
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body || {};
    const validStatuses = ['pending', 'confirmed', 'completed', 'denied', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const terminal = ['confirmed', 'completed', 'denied', 'expired', 'cancelled'].includes(status);
    const result = await pool.query(
      `UPDATE bookings
          SET status = $1,
              notes = CASE WHEN $2::text IS NULL THEN notes ELSE $2::text END,
              decided_at = CASE WHEN $3::boolean THEN now() ELSE decided_at END,
              updated_at = now()
        WHERE id = $4
        RETURNING *`,
      [status, notes === undefined || notes === '' ? null : String(notes), terminal, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update booking status error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.status(200).json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Today's upcoming bookings for the live admin dashboard widget.
exports.getTodayBookings = async (_req, res) => {
  try {
    await expireStaleHolds();
    const result = await pool.query(
      `SELECT b.*
         FROM bookings b
         CROSS JOIN public.booking_settings s
        WHERE s.id = 1
          AND b.slot_start IS NOT NULL
          AND (b.slot_start AT TIME ZONE s.timezone)::date = (now() AT TIME ZONE s.timezone)::date
          AND b.status IN ('pending', 'confirmed')
        ORDER BY b.slot_start ASC`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get today bookings error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Authenticated admin live-event stream. Payloads contain only IDs/status flags.
exports.streamBookings = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('data: {"type": "connected"}\n\n');
  const remove = sseHub.addClient(res, req);
  req.on('close', remove);
};
