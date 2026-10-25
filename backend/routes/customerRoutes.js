import express from 'express';
import {
  cancelMyBooking,
  getMyBookingSummary,
  listMyBookings,
  reviewMyBooking,
} from '../controllers/customerBookingController.js';
import {
  getCustomerMe,
  loginCustomer,
  registerCustomer,
  requestCustomerOtp,
  updateCustomerInterests,
} from '../controllers/customerController.js';
import { getRecommendations } from '../controllers/recommendationController.js';
import { optionalCustomer, requireCustomer } from '../middleware/customerAuth.js';
import { loginLimiter, otpLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

router.post('/register/otp', otpLimiter, requestCustomerOtp);
router.post('/register', loginLimiter, registerCustomer);
router.post('/login', loginLimiter, loginCustomer);
router.get('/me', requireCustomer, getCustomerMe);
router.put('/interests', requireCustomer, updateCustomerInterests);

// Booking history
router.get('/bookings', requireCustomer, listMyBookings);
router.get('/bookings/summary', requireCustomer, getMyBookingSummary);
router.patch('/bookings/:id/cancel', requireCustomer, cancelMyBooking);
router.post('/bookings/:id/review', requireCustomer, reviewMyBooking);

// Works logged out too (general shelves only).
router.get('/recommendations', optionalCustomer, getRecommendations);

export default router;
