import express from 'express';
import { getBookingUpdates, listBookings, rescheduleBooking, updateBookingStatus } from '../controllers/bookingController.js';
import { listMyReviews } from '../controllers/reviewController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Route to list bookings with optional query filters (status, date)
router.get('/', auth, listBookings);

// Reviews customers left for this business
router.get('/reviews', auth, listMyReviews);

// New bookings and customer cancellations since a given time (polled by the dashboard)
router.get('/updates', auth, getBookingUpdates);

// Route to update the status of a specific booking (e.g., mark as cancelled, confirmed)
router.patch('/:id', auth, updateBookingStatus);

// Route to reschedule a specific booking to a new time slot
router.patch('/:id/reschedule', auth, rescheduleBooking);

export default router;
