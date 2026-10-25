import express from 'express';
import {
  getGoogleConnectUrl,
  getMe,
  handleGoogleCallback,
  login,
  register,
  requestRegistrationOtp,
  updateProfile,
  verifyRegistrationOtp,
} from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { loginLimiter, otpLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

router.post('/register/otp', otpLimiter, requestRegistrationOtp);
router.post('/register/otp/verify', loginLimiter, verifyRegistrationOtp);
router.post('/register', loginLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);

// Google Calendar OAuth
router.get('/google/connect', auth, getGoogleConnectUrl);
router.get('/google/callback', handleGoogleCallback);

export default router;
