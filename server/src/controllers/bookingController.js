const pool = require('../db');
const sseHub = require('../utils/sseHub');

const DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';

function dateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(dateString) {
  return new Date(`${dateString}T12:00:00Z`).getUTCDay();
}

// Admin-only SSE stream. The admin SPA sends its Supabase access token as
// ?token=... because EventSource cannot set an Authorization header.
exports.streamBookings = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('data: {"type": "connected"}\n\n');
  const remove = sseHub.addClient(res, req);
  req.on('close', remove);
};

// Public booking form gets only safe availability configuration.
exports.getBookingAvailability = async (_req, res) => {
  try {
    await pool.query('select public.ensure_booking_slots_current()');
    const rawSettings = await pool.query('select timezone, days_ahead from public.booking_settings where id = 1');
    const timezone = rawSettings.rows[0]?.timezone || DEFAULT_TIMEZONE;
    const daysAhead = Math.max(1, Math.min(7, Number(rawSettings.rows[0]?.days_ahead || 7)));
    const [rules, state, counts] = await Promise.all([
      pool.query('select day_of_week, is_open, open_time, close_time, slot_minutes from public.booking_availability_rules order by day_of_week'),
      pool.query('select version, updated_at from public.booking_availability_state where id = 1'),
      pool.query(
        `select to_char(slot_start at time zone $1, 'YYYY-MM-DD') as date,
                count(*)::int as slot_count
           from public.booking_slots
          where is_available = true
            and slot_start > now()
            and public.is_slot_open(slot_start)
          group by 1`,
        [timezone]
      ),
    ]);
    const ruleMap = new Map(rules.rows.map((rule) => [Number(rule.day_of_week), rule]));
    const countMap = new Map(counts.rows.map((row) => [String(row.date), Number(row.slot_count)]));
    const today = dateInTimeZone(new Date(), timezone);
    const dates = Array.from({ length: daysAhead }, (_, index) => {
      const date = addDays(today, index);
      const dow = dayOfWeek(date);
      const rule = ruleMap.get(dow);
      return {
        date,
        day_of_week: dow,
        is_open: Boolean(rule?.is_open),
        open_time: String(rule?.open_time || '08:00').slice(0, 5),
        close_time: String(rule?.close_time || '18:00').slice(0, 5),
        slot_count: countMap.get(date) || 0,
      };
    });
    res.status(200).json({
      success: true,
      data: {
        settings: { timezone, days_ahead: daysAhead },
        rules: rules.rows,
        version: Number(state.rows[0]?.version || 1),
        dates,
      },
    });
  } catch (error) {
    console.error('Booking availability error:', error.code || error.message);
    res.status(500).json({ success: false, message: 'Could not load availability' });
  }
};

// Public booking form gets PII-free slot choices for one clinic-local date.
exports.getBookingSlots = async (req, res) => {
  const date = String(req.query?.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'A valid date is required' });
  }
  try {
    await pool.query('select public.ensure_booking_slots_current()');
    const result = await pool.query(
      `select bs.slot_start,
              bs.slot_end,
              s.timezone,
              to_char(bs.slot_start at time zone s.timezone, 'HH24:MI') as label,
              to_char(bs.slot_start at time zone s.timezone, 'YYYY-MM-DD') as local_date
       from public.booking_slots bs
       cross join public.booking_settings s
       where s.id = 1
         and bs.is_available = true
         and bs.slot_start > now()
         and public.is_slot_open(bs.slot_start)
         and (bs.slot_start at time zone s.timezone)::date = $1::date
       order by bs.slot_start asc`,
      [date]
    );
    res.status(200).json({
      success: true,
      data: {
        date,
        timezone: result.rows[0]?.timezone || 'Africa/Addis_Ababa',
        slots: result.rows.map(({ slot_start, slot_end, label }) => ({ slot_start, slot_end, label })),
      },
    });
  } catch (error) {
    console.error('Booking slots error:', error.code || error.message);
    res.status(500).json({ success: false, message: 'Could not load available times' });
  }
};

// Create new booking from the public website form.
// The database function atomically reserves the slot, creates a generic
// notification and emits an admin SSE event. The response contains no PII.
exports.createBooking = async (req, res) => {
  const formData = req.body || {};
  const patientName = `${String(formData.name || '').trim()} ${String(formData.father_name || '').trim()}`.trim();
  const patientEmail = String(formData.email || '').trim();
  const patientPhone = String(formData.phone || '').trim();
  const reason = Array.isArray(formData.problems)
    ? formData.problems.join(', ')
    : String(formData.problems || 'Not specified');
  const rawSlot = String(formData.slot_start || '').trim();
  const slotDate = new Date(rawSlot);

  if (!patientName || !patientEmail || !rawSlot || Number.isNaN(slotDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Name, email and a valid time slot are required' });
  }

  try {
    const result = await pool.query(
      `select * from public.create_booking($1::text, $2::text, $3::text, $4::text, $5::jsonb, $6::timestamptz)`,
      [patientName, patientEmail, patientPhone || null, reason, JSON.stringify(formData), slotDate.toISOString()]
    );
    const row = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: row.booking_id,
        slot_start: row.reserved_slot,
        status: row.booking_status,
        expires_at: row.hold_expires_at,
      },
    });
  } catch (error) {
    const unavailable = error.code === 'P0001' || String(error.message || '').includes('SLOT_UNAVAILABLE');
    if (unavailable) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_UNAVAILABLE',
        message: 'That time is no longer available. Please choose another time.',
      });
    }
    console.error('Create booking error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not submit booking' });
  }
};
