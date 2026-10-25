import crypto from 'crypto';
import Razorpay from 'razorpay';

let client = null;

export const isRazorpayConfigured = () => (
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
);

export const isRazorpayTestMode = () => String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_');

export const getRazorpay = () => {
  if (!isRazorpayConfigured()) return null;
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
};

/**
 * Razorpay signs "<order id>|<payment id>" with the key secret. A matching
 * signature proves the checkout result came from Razorpay and was not made up
 * by the browser.
 */
export const isValidRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const given = Buffer.from(String(signature));
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
};
