import 'dotenv/config';
import './utils/timezone.js';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import { apiLimiter } from './middleware/rateLimits.js';
import { hideErrorDetails, rejectOperatorInjection } from './middleware/security.js';
import { getEmailConfigStatus } from './utils/bookingNotifications.js';
import { isGoogleConfigured } from './utils/googleCalendar.js';
import { getPaymentProvider, isPaymentTestMode } from './utils/payments.js';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookme';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to backend/.env');
  process.exit(1);
}

// A live server must not start half-configured: a weak secret or a default
// address would be a security hole that nobody notices until it is abused.
if (process.env.NODE_ENV === 'production') {
  const problems = [];
  if (process.env.JWT_SECRET.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is missing');
  if (!process.env.CLIENT_URL) problems.push('CLIENT_URL is missing (the address of the frontend)');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) problems.push('ADMIN_EMAIL and ADMIN_PASSWORD are missing');

  if (problems.length > 0) {
    console.error('Cannot start in production:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
}

const app = express();

app.use(cors({ origin: CLIENT_URL.split(',').map((origin) => origin.trim()) }));
// Behind a host's load balancer the real client address is in X-Forwarded-For.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiLimiter);
app.use(rejectOperatorInjection);
app.use(hideErrorDetails);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Anything a route did not handle itself (bad JSON, unexpected errors).
app.use((error, req, res, next) => {
  const status = error.status || error.statusCode || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong' : error.message });
});

const describeIntegrations = () => {
  const provider = getPaymentProvider();
  const payments = {
    razorpay: `Razorpay checkout (${isPaymentTestMode() ? 'test' : 'LIVE'} keys)`,
    stripe: `Stripe checkout (${isPaymentTestMode() ? 'test' : 'LIVE'} keys)`,
    demo: 'DEMO mode (paid bookings are auto-confirmed, no real checkout)',
  }[provider] || 'not configured';
  const email = getEmailConfigStatus().configured
    ? 'Brevo'
    : 'not configured (OTP codes are printed here and shown on screen)';

  console.log(`  Payments:        ${payments}`);
  console.log(`  Email:           ${email}`);
  console.log(`  Google Calendar: ${isGoogleConfigured() ? 'configured' : 'not configured'}`);
};

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BookMe API running on http://localhost:${PORT}`);
      describeIntegrations();
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
