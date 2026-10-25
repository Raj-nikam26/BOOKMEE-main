import rateLimit from 'express-rate-limit';

const build = (windowMinutes, limit, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message },
});

// Password guessing protection for every login and signup form.
export const loginLimiter = build(15, 30, 'Too many attempts. Please try again in a few minutes');

// Each OTP request sends an email, so keep these tight.
export const otpLimiter = build(10, 10, 'Too many verification codes requested. Please wait a few minutes');

// A ceiling for everything else, per IP address.
export const apiLimiter = build(1, 300, 'Too many requests. Please slow down');
