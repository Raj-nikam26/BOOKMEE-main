import crypto from 'crypto';
import EmailOtp from '../models/EmailOtp.js';
import { getEmailConfigStatus, sendOtpNotification } from './bookingNotifications.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // matches the countdown on the Send code button

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
const normalize = (email = '') => String(email).toLowerCase().trim();

/**
 * Creates a fresh 6-digit code and emails it.
 * When Brevo is not configured the code is printed in the backend terminal and
 * returned as devCode so the app can still be used locally.
 */
export const createEmailOtp = async ({ email, purpose }) => {
  const normalizedEmail = normalize(email);

  // One code per address every 30 seconds, whoever asks. Without this, anyone
  // could make the server send a stream of emails to somebody else's inbox.
  const latest = await EmailOtp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const error = new Error('A code was just sent. Please wait a few seconds before asking for another');
    error.statusCode = 429;
    throw error;
  }

  const code = String(crypto.randomInt(100000, 1000000));

  await EmailOtp.deleteMany({ email: normalizedEmail, purpose });
  await EmailOtp.create({
    email: normalizedEmail,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  if (!getEmailConfigStatus().configured) {
    // Showing the code on screen would defeat the verification, so only do it locally.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email sending is not configured on the server');
    }

    console.log(`[DEV OTP] ${purpose} code for ${normalizedEmail}: ${code}`);
    return { sent: false, devCode: code };
  }

  await sendOtpNotification({ email: normalizedEmail, code, purpose });
  return { sent: true };
};

export const verifyEmailOtp = async ({ email, purpose, code, consume = false }) => {
  if (!code) return { verified: false, reason: 'Email verification code is required' };

  const otp = await EmailOtp.findOne({ email: normalize(email), purpose }).sort({ createdAt: -1 });
  if (!otp) return { verified: false, reason: 'Request a verification code first' };
  if (otp.expiresAt < new Date()) return { verified: false, reason: 'Verification code expired. Request a new one' };
  if (otp.attempts >= MAX_ATTEMPTS) return { verified: false, reason: 'Too many attempts. Request a new code' };

  if (otp.codeHash !== hashCode(code)) {
    otp.attempts += 1;
    await otp.save();
    return { verified: false, reason: 'Invalid verification code' };
  }

  if (consume) await otp.deleteOne();
  return { verified: true };
};
