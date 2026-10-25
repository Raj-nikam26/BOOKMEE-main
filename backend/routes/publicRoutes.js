import express from 'express';
import {
  cancelPublicBookingPayment,
  createPublicBooking,
  getBookingStatus,
  getPublicBusiness,
  getPublicSlots,
  listPublicBusinesses,
  requestPublicBookingOtp,
  trackBusinessView,
  verifyRazorpayPayment,
  verifyPublicBookingOtp,
} from '../controllers/publicController.js';
import { optionalCustomer } from '../middleware/customerAuth.js';
import { loginLimiter, otpLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

// Every public page works logged out, but knows the customer when logged in.
router.use(optionalCustomer);

// Marketplace directory
router.get('/directory/businesses', listPublicBusinesses);

// Payment result pages (no slug needed)
router.get('/bookings/status', getBookingStatus);
router.post('/bookings/cancel', cancelPublicBookingPayment);
router.post('/bookings/razorpay/verify', verifyRazorpayPayment);

// Public booking page for one business
router.get('/:slug', getPublicBusiness);
router.get('/:slug/slots', getPublicSlots);
router.post('/:slug/view', trackBusinessView);
router.post('/:slug/otp', otpLimiter, requestPublicBookingOtp);
router.post('/:slug/otp/verify', loginLimiter, verifyPublicBookingOtp);
router.post('/:slug/bookings', createPublicBooking);

export default router;
