const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateEventSourceToken } = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');

// EventSource uses a short-lived ?token= because it cannot send Bearer headers.
router.get('/stream', authenticateEventSourceToken, bookingController.streamBookings);

router.use(authenticateToken);

// Today's upcoming bookings (live dashboard widget)
router.get('/today', bookingController.getTodayBookings);

// Get all bookings
router.get('/', bookingController.getAllBookings);

// Get single booking by ID
router.get('/:id', bookingController.getBookingById);

// Create new booking (not yet implemented in controller)
// router.post('/', bookingController.createBooking);

// Update booking status (confirm/cancel)
router.put('/:id/status', bookingController.updateBookingStatus);

// Delete booking
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;
