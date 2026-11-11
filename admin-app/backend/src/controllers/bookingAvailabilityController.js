const pool = require('../db');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIMEZONE = 'Africa/Addis_Ababa';

function timeMinutes(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

function intInRange(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

async function loadAvailability() {
  await pool.query('select public.ensure_booking_slots_current()');
  const [settings, rules, state] = await Promise.all([
    pool.query('select timezone, days_ahead, pending_hold_minutes from public.booking_settings where id = 1'),
    pool.query('select day_of_week, is_open, open_time, close_time, slot_minutes from public.booking_availability_rules order by day_of_week'),
    pool.query('select version, reason, updated_at from public.booking_availability_state where id = 1'),
  ]);
  return {
    settings: settings.rows[0] || { timezone: TIMEZONE, days_ahead: 7, pending_hold_minutes: 30 },
    rules: rules.rows,
    state: state.rows[0] || { version: 1, reason: 'initial' },
  };
}

exports.getAvailability = async (_req, res) => {
  try {
    res.status(200).json({ success: true, data: await loadAvailability() });
  } catch (error) {
    console.error('Get booking availability error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not load availability settings' });
  }
};

// One transaction updates all weekly rules, rebuilds future free slots and
// bumps the public-safe availability version row. Reserved slots are kept.
exports.updateAvailability = async (req, res) => {
  const rules = req.body?.rules;
  const settings = req.body?.settings || {};
  if (!Array.isArray(rules) || rules.length !== 7) {
    return res.status(400).json({ success: false, message: 'All seven weekday rules are required' });
  }

  const seen = new Set();
  for (const rule of rules) {
    const day = Number(rule?.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6 || seen.has(day)) {
      return res.status(400).json({ success: false, message: 'Invalid weekday rule' });
    }
    seen.add(day);
    if (!TIME_RE.test(String(rule?.open_time || '')) || !TIME_RE.test(String(rule?.close_time || ''))) {
      return res.status(400).json({ success: false, message: 'Open and close times must use HH:MM' });
    }
    const slotMinutes = Number.parseInt(rule?.slot_minutes, 10);
    if (!Number.isInteger(slotMinutes) || slotMinutes < 5 || slotMinutes > 240) {
      return res.status(400).json({ success: false, message: 'Slot length must be 5–240 minutes' });
    }
    if (rule.is_open && timeMinutes(rule.close_time) <= timeMinutes(rule.open_time)) {
      return res.status(400).json({ success: false, message: 'Close time must be after open time' });
    }
  }

  const daysAhead = intInRange(settings.days_ahead, 1, 7, 7);
  const holdMinutes = intInRange(settings.pending_hold_minutes, 5, 1440, 30);
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const rule of rules) {
      await client.query(
        `insert into public.booking_availability_rules
           (day_of_week, is_open, open_time, close_time, slot_minutes, updated_at)
         values ($1, $2, $3::time, $4::time, $5, now())
         on conflict (day_of_week) do update set
           is_open = excluded.is_open,
           open_time = excluded.open_time,
           close_time = excluded.close_time,
           slot_minutes = excluded.slot_minutes,
           updated_at = now()`,
        [
          Number(rule.day_of_week),
          Boolean(rule.is_open),
          rule.open_time,
          rule.close_time,
          Number(rule.slot_minutes),
        ]
      );
    }
    await client.query(
      `update public.booking_settings
          set timezone = $1, days_ahead = $2, pending_hold_minutes = $3, updated_at = now()
        where id = 1`,
      [TIMEZONE, daysAhead, holdMinutes]
    );
    await client.query('select public.regenerate_booking_slots()');
    await client.query(
      `update public.booking_settings
          set last_generated_date = (now() at time zone $1)::date,
              updated_at = now()
        where id = 1`,
      [TIMEZONE]
    );
    await client.query('commit');
    res.status(200).json({ success: true, data: await loadAvailability() });
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error('Update booking availability error:', error.code || 'unknown');
    res.status(500).json({ success: false, message: 'Could not update availability settings' });
  } finally {
    client.release();
  }
};
