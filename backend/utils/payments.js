import { isRazorpayConfigured, isRazorpayTestMode } from './razorpay.js';
import { isDemoPaymentMode } from './stripe.js';

/**
 * Which gateway takes payment for paid bookings, in order of preference:
 * 'razorpay', 'stripe', 'demo' (local only, no real checkout) or null.
 */
export const getPaymentProvider = () => {
  if (isRazorpayConfigured()) return 'razorpay';
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (isDemoPaymentMode()) return 'demo';
  return null;
};

/**
 * True when no real money can move: demo mode or a gateway's test keys.
 */
export const isPaymentTestMode = () => {
  const provider = getPaymentProvider();
  if (provider === 'razorpay') return isRazorpayTestMode();
  if (provider === 'stripe') return String(process.env.STRIPE_SECRET_KEY).startsWith('sk_test_');
  return provider === 'demo';
};
