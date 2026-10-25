import Stripe from 'stripe';

const PLATFORM_FEE_PERCENT = 10;
let stripeClient = null;

export const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

// Without any payment gateway key, paid bookings are confirmed instantly so the flow can be demoed.
// Never in production: that would hand out paid services for free.
export const isDemoPaymentMode = () => (
  !process.env.STRIPE_SECRET_KEY
  && !process.env.RAZORPAY_KEY_ID
  && process.env.DEMO_PAYMENTS === 'true'
  && process.env.NODE_ENV !== 'production'
);

// Service prices are stored in rupees, Stripe wants paise.
export const toStripeAmount = (price = 0) => Math.round(Number(price || 0) * 100);

export const calculatePlatformSplit = (amount = 0) => {
  const platformFeeAmount = Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
  return { platformFeeAmount, providerPayoutAmount: amount - platformFeeAmount };
};
