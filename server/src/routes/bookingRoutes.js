const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAdminToken } = require('../middleware/supabaseAuth');

// Authenticated admin live-event stream. EventSource cannot set an
// Authorization header, so the short-lived token is passed as ?token=.
router.get('/stream', requireAdminToken, bookingController.streamBookings);

// Public, PII-free booking availability.
router.get('/availability', bookingController.getBookingAvailability);
router.get('/slots', bookingController.getBookingSlots);

// Public booking submission; the DB function performs atomic slot locking.
router.post('/', bookingController.createBooking);

module.exports = router;
