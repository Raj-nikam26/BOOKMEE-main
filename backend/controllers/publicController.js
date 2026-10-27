import crypto from 'crypto';
import { getCategoryLabel, isValidCategory } from '../constants/categories.js';
import Availability from '../models/Availability.js';
import Booking from '../models/Booking.js';
import Interaction from '../models/Interaction.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import { sendBookingNotification } from '../utils/bookingNotifications.js';
import { searchBusinesses } from '../utils/businessCards.js';
import { buildCustomerCalendarUrl } from '../utils/calendarLink.js';
import { createEmailOtp, verifyEmailOtp } from '../utils/emailOtp.js';
import { createBookingCalendarEvent } from '../utils/googleCalendar.js';
import { timesOverlap } from '../utils/overlap.js';
import { getPaymentProvider, isPaymentTestMode } from '../utils/payments.js';
import { getRazorpay, isValidRazorpaySignature } from '../utils/razorpay.js';
import { calculatePlatformSplit, getStripe, toStripeAmount } from '../utils/stripe.js';
import { cleanEmail, cleanText, DATE_PATTERN, isValidEmail, TIME_PATTERN } from '../utils/validate.js';
import { createBookingPayoutTransaction } from '../utils/wallet.js';

const AVATAR_PATTERN = /^A\d{1,2}\.png$/;
const VIEW_REPEAT_WINDOW_MS = 30 * 60 * 1000;
const MAX_OPEN_CHECKOUTS_PER_EMAIL = 3;

// The only booking details the public status endpoint gives out.
const toPublicBooking = (booking) => ({
  id: booking._id,
  date: booking.date,
  startTime: booking.startTime,
  endTime: booking.endTime,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  amount: booking.amount,
  customerCalendarUrl: booking.customerCalendarUrl,
  serviceId: booking.serviceId?.name
    ? { name: booking.serviceId.name, duration: booking.serviceId.duration, price: booking.serviceId.price }
    : null,
});

// An unpaid checkout only holds its slot for this long.
const PENDING_PAYMENT_HOLD_MS = 15 * 60 * 1000;

const getBusinessBySlug = (slug) => User.findOne({ slug: String(slug || '').toLowerCase() });

const findActiveSlotBookings = ({ userId, date }) => Booking.find({
  userId,
  date,
  $or: [
    { status: { $in: ['confirmed', 'pending'] } },
    { status: 'pending_payment', createdAt: { $gte: new Date(Date.now() - PENDING_PAYMENT_HOLD_MS) } },
  ],
});

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTime = (minutes) => (
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
);

const getLocalDateKey = (date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

/**
 * Marketplace directory, one page at a time.
 * Query: search, category, sort (recommended | rating | newest | price-low | price-high), page.
 */
export const listPublicBusinesses = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().slice(0, 60);
    const category = isValidCategory(req.query.category) ? req.query.category : undefined;

    res.json(await searchBusinesses({
      search,
      category,
      sort: req.query.sort,
      page: req.query.page,
    }));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Records that a logged-in customer opened a booking page (recommendation signal).
 */
export const trackBusinessView = async (req, res) => {
  try {
    if (req.customer) {
      const business = await getBusinessBySlug(req.params.slug);
      if (business) {
        // Reloading a page must not let one account inflate a business's popularity.
        const recentView = await Interaction.exists({
          customerId: req.customer.id,
          businessId: business._id,
          type: 'view',
          createdAt: { $gte: new Date(Date.now() - VIEW_REPEAT_WINDOW_MS) },
        });
        if (!recentView) {
          await Interaction.create({ customerId: req.customer.id, businessId: business._id, type: 'view' });
        }
      }
    }
    res.status(204).end();
  } catch (error) {
    res.status(204).end();
  }
};

export const getPublicBusiness = async (req, res) => {
  try {
    const business = await getBusinessBySlug(req.params.slug);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const services = await Service.find({
      userId: business._id,
      isActive: true,
      isDeleted: { $ne: true },
    }).sort({ createdAt: 1 });

    const reviews = await Review.find({ businessId: business._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName rating comment createdAt')
      .lean();

    res.json({
      business: {
        name: business.name,
        slug: business.slug,
        businessName: business.businessName,
        businessDescription: business.businessDescription,
        brandTheme: business.brandTheme,
        brandAccent: business.brandAccent,
        category: business.category,
        categoryLabel: getCategoryLabel(business.category),
        timezone: business.timezone,
        ratingAverage: business.ratingAverage,
        ratingCount: business.ratingCount,
        paymentProvider: getPaymentProvider(),
        paymentTestMode: isPaymentTestMode(),
      },
      services,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Every slot a customer may book for one service on one date: inside the
 * business's opening hours, not in the past, and not overlapping a booking.
 * Both the slot picker and the booking endpoint use this, so a request can
 * never book a time the page would not have offered.
 */
const getAvailableSlots = async ({ business, service, date }) => {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  const [availability, bookings] = await Promise.all([
    Availability.findOne({ userId: business._id, dayOfWeek }),
    findActiveSlotBookings({ userId: business._id, date }),
  ]);

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = [];

  if (date < todayKey) return slots;

  (availability?.slots || []).forEach((window) => {
    const windowEnd = toMinutes(window.endTime);

    for (let start = toMinutes(window.startTime); start + service.duration <= windowEnd; start += service.duration) {
      const startTime = toTime(start);
      const endTime = toTime(start + service.duration);
      const isPast = date === todayKey && start <= nowMinutes;
      const isBooked = bookings.some((booking) => (
        timesOverlap(startTime, endTime, booking.startTime, booking.endTime)
      ));

      if (!isPast && !isBooked) {
        slots.push({ startTime, endTime });
      }
    }
  });

  return slots.sort((x, y) => x.startTime.localeCompare(y.startTime));
};

// MongoDB duplicate key: another request took the same slot a moment earlier.
const isDuplicateSlot = (error) => error?.code === 11000;

export const getPublicSlots = async (req, res) => {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      return res.status(400).json({ message: 'Service and date are required' });
    }

    const business = await getBusinessBySlug(req.params.slug);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const service = await Service.findOne({
      _id: serviceId,
      userId: business._id,
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ slots: await getAvailableSlots({ business, service, date }) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const requestPublicBookingOtp = async (req, res) => {
  try {
    const customerEmail = String(req.body.customerEmail || '').toLowerCase().trim();
    if (!customerEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const business = await getBusinessBySlug(req.params.slug);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const result = await createEmailOtp({ email: customerEmail, purpose: 'booking' });
    res.json({ message: 'Verification code sent', devCode: result.devCode });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Could not send verification code', error: error.message });
  }
};

export const verifyPublicBookingOtp = async (req, res) => {
  try {
    const { customerEmail, emailOtp } = req.body;
    
    if (!customerEmail || !emailOtp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpResult = await verifyEmailOtp({
      email: customerEmail,
      purpose: 'booking',
      code: emailOtp,
      consume: false,
    });

    if (!otpResult.verified) {
      return res.status(400).json({ message: otpResult.reason || 'Invalid OTP' });
    }

    res.json({ message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createPublicBooking = async (req, res) => {
  try {
    // Everything from the browser is coerced to plain text of a sane length.
    const serviceId = cleanText(req.body.serviceId, 24);
    const customerName = cleanText(req.body.customerName, 80);
    const customerEmail = cleanEmail(req.body.customerEmail);
    const customerAvatar = AVATAR_PATTERN.test(req.body.customerAvatar) ? req.body.customerAvatar : 'A1.png';
    const date = cleanText(req.body.date, 10);
    const startTime = cleanText(req.body.startTime, 5);
    const endTime = cleanText(req.body.endTime, 5);
    const notes = cleanText(req.body.notes, 500);
    const emailOtp = cleanText(req.body.emailOtp, 6);

    if (!serviceId || !customerName || !customerEmail || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'All booking fields are required' });
    }
    if (!isValidEmail(customerEmail) || !DATE_PATTERN.test(date) || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return res.status(400).json({ message: 'Some booking details are not valid' });
    }

    const normalizedCustomerEmail = customerEmail;

    const business = await getBusinessBySlug(req.params.slug);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const service = await Service.findOne({
      _id: serviceId,
      userId: business._id,
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    // The slot must be one the booking page would offer right now: within opening
    // hours, in the future, the right length for this service, and still free.
    const availableSlots = await getAvailableSlots({ business, service, date });
    const isOffered = availableSlots.some((slot) => slot.startTime === startTime && slot.endTime === endTime);

    if (!isOffered) {
      return res.status(409).json({ message: 'That slot is no longer available. Please pick another time' });
    }

    // A logged-in customer booking with their own account email does not need an OTP.
    const isOwnAccountEmail = req.customer?.verified === true && req.customer.email === normalizedCustomerEmail;
    if (!isOwnAccountEmail) {
      const otpResult = await verifyEmailOtp({
        email: normalizedCustomerEmail,
        purpose: 'booking',
        code: emailOtp,
        consume: true,
      });

      if (!otpResult.verified) {
        return res.status(400).json({ message: otpResult.reason || 'Email verification is required' });
      }
    }

    const amount = toStripeAmount(service.price);
    const { platformFeeAmount, providerPayoutAmount } = calculatePlatformSplit(amount);
    const currency = 'inr';
    const provider = amount > 0 ? getPaymentProvider() : null;

    if (amount > 0 && !provider) {
      return res.status(503).json({ message: 'Online payments are not set up yet, so paid services cannot be booked' });
    }

    const customerCalendarUrl = buildCustomerCalendarUrl({
      business,
      service,
      booking: { date, startTime, endTime, customerName, customerEmail: normalizedCustomerEmail, notes },
    });

    // Each unpaid checkout holds a slot for a few minutes. Cap them per address
    // so one person cannot block a business's whole day without paying.
    if (amount > 0) {
      const openCheckouts = await Booking.countDocuments({
        customerEmail: normalizedCustomerEmail,
        status: 'pending_payment',
        createdAt: { $gte: new Date(Date.now() - PENDING_PAYMENT_HOLD_MS) },
      });
      if (openCheckouts >= MAX_OPEN_CHECKOUTS_PER_EMAIL) {
        return res.status(429).json({ message: 'You have unfinished payments. Complete or close them, or try again in a few minutes' });
      }
    }

    const accessToken = crypto.randomBytes(24).toString('hex');
    const booking = await Booking.create({
      userId: business._id,
      accessToken,
      customerId: req.customer?.id,
      serviceId,
      customerName,
      customerEmail: normalizedCustomerEmail,
      customerAvatar: customerAvatar || 'A1.png',
      date,
      startTime,
      endTime,
      notes: notes || '',
      amount,
      platformFeeAmount,
      providerPayoutAmount,
      payoutStatus: amount > 0 ? 'pending' : 'not_required',
      currency,
      paymentStatus: amount > 0 ? 'pending' : 'not_required',
      status: amount > 0 ? 'pending_payment' : 'confirmed',
      confirmedAt: amount > 0 ? undefined : new Date(),
      customerCalendarUrl,
    });

    if (req.customer) {
      await Interaction.create({
        customerId: req.customer.id,
        businessId: business._id,
        bookingId: booking._id,
        type: 'book',
      });
    }

    if (amount === 0) {
      try {
        const calendarResult = await createBookingCalendarEvent({ business, service, booking });
        booking.googleEventId = calendarResult.googleEventId || '';
        booking.customerCalendarUrl = calendarResult.customerCalendarUrl;
        await booking.save();
      } catch (calendarError) {
        booking.customerCalendarUrl = customerCalendarUrl;
        await booking.save();
      }

      let emailResult = { sent: 'processing' };
      sendBookingNotification({ business, service, booking, type: 'confirmed' })
        .catch(emailError => console.error('Booking confirmation email failed:', emailError.message));

      return res.status(201).json({
        message: 'Booking confirmed',
        booking,
        customerCalendarUrl: booking.customerCalendarUrl,
        email: emailResult,
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    booking.paymentProvider = provider;

    // Razorpay: create an order and let the booking page open the checkout.
    // The booking stays "pending payment" until verifyRazorpayPayment confirms it.
    if (provider === 'razorpay') {
      let order;
      try {
        order = await getRazorpay().orders.create({
          amount, // paise
          currency: 'INR',
          receipt: String(booking._id),
          notes: { bookingId: String(booking._id), business: business.slug },
        });
      } catch (gatewayError) {
        booking.status = 'payment_failed';
        booking.paymentStatus = 'failed';
        await booking.save();
        console.error('Razorpay order failed:', gatewayError.error?.description || gatewayError.message);
        return res.status(502).json({ message: 'Could not start the payment. Please try again' });
      }

      booking.razorpayOrderId = order.id;
      await booking.save();

      return res.status(201).json({
        message: 'Continue to payment',
        bookingId: booking._id,
        accessToken,
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: order.id,
          amount,
          currency: 'INR',
          name: business.businessName || business.name,
          description: `${service.name} on ${date} at ${startTime}`,
          prefill: { name: customerName, email: normalizedCustomerEmail },
        },
      });
    }

    // Demo payment mode: no gateway key, so mark the booking paid without a checkout.
    if (provider === 'demo') {
      await confirmPaidBooking({ booking, business, service });
      return res.status(201).json({
        message: 'Booking confirmed (demo payment)',
        bookingId: booking._id,
        accessToken,
        checkoutUrl: `${clientUrl}/booking/success?booking_id=${booking._id}&token=${accessToken}&slug=${business.slug}`,
      });
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: normalizedCustomerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: service.name,
              description: `${date} ${startTime}-${endTime}`,
            },
          },
        },
      ],
      metadata: {
        bookingId: String(booking._id),
      },
      success_url: `${clientUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&slug=${business.slug}`,
      cancel_url: `${clientUrl}/booking/cancelled?booking_id=${booking._id}&token=${accessToken}&slug=${business.slug}`,
    });

    booking.stripeSessionId = session.id;
    await booking.save();

    res.status(201).json({
      message: 'Continue to payment',
      bookingId: booking._id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    if (isDuplicateSlot(error)) {
      return res.status(409).json({ message: 'That slot was just booked by someone else. Please pick another time' });
    }

    const errorMsg = error.type?.includes('Stripe') ? (error.raw?.message || error.message) : 'Server error: ' + error.message;
    res.status(error.statusCode || 500).json({ message: errorMsg, error: error.message });
  }
};

const confirmPaidBooking = async ({ booking, business, service, session }) => {
  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    return booking;
  }

  const conflictingBookings = await Booking.find({
    _id: { $ne: booking._id },
    userId: booking.userId,
    date: booking.date,
    status: 'confirmed',
  });

  const hasConflict = conflictingBookings.some((candidate) => (
    timesOverlap(booking.startTime, booking.endTime, candidate.startTime, candidate.endTime)
  ));

  if (hasConflict) {
    booking.status = 'payment_failed';
    booking.paymentStatus = 'failed';
    await booking.save();
    throw new Error('This slot is no longer available. No booking was created.');
  }

  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  booking.paymentStatus = 'paid';
  booking.payoutStatus = booking.providerPayoutAmount > 0 ? 'available' : 'not_required';

  try {
    const calendarResult = await createBookingCalendarEvent({ business, service, booking });
    booking.googleEventId = calendarResult.googleEventId || '';
    booking.customerCalendarUrl = calendarResult.customerCalendarUrl || booking.customerCalendarUrl;
  } catch (calendarError) {
    console.error('Google Calendar confirmation failed:', calendarError.message);
  }

  try {
    await booking.save();
  } catch (error) {
    if (!isDuplicateSlot(error)) throw error;

    // Someone else was confirmed for this exact slot in the same instant.
    await Booking.updateOne({ _id: booking._id }, { status: 'payment_failed', paymentStatus: 'failed' });
    throw new Error('This slot is no longer available. No booking was created.');
  }

  await createBookingPayoutTransaction({
    booking,
    description: `Booking payment from ${booking.customerName || 'Customer'}`,
  });

  sendBookingNotification({ business, service, booking, type: 'confirmed' })
    .catch(emailError => console.error('Booking confirmation email failed:', emailError.message));

  return booking;
};

/**
 * Called by the booking page after the Razorpay checkout reports success.
 * Nothing the browser says is trusted: the signature is checked, then the
 * payment itself is read back from Razorpay before the booking is confirmed.
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!bookingId || !orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'Payment details are missing' });
    }

    const booking = await Booking.findOne({ _id: bookingId, razorpayOrderId: orderId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // The same success can arrive twice (double click, retry). Answer the same way.
    if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
      return res.json({ message: 'Booking confirmed', bookingId: booking._id });
    }

    if (!isValidRazorpaySignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ message: 'Payment could not be verified' });
    }

    const razorpay = getRazorpay();
    let payment = await razorpay.payments.fetch(paymentId);

    if (payment.order_id !== orderId || payment.amount !== booking.amount) {
      return res.status(400).json({ message: 'Payment does not match this booking' });
    }
    if (payment.status === 'authorized') {
      payment = await razorpay.payments.capture(paymentId, booking.amount, 'INR');
    }
    if (payment.status !== 'captured') {
      return res.status(402).json({ message: 'Payment was not completed' });
    }

    const [business, service] = await Promise.all([
      User.findById(booking.userId),
      Service.findById(booking.serviceId),
    ]);
    if (!business || !service) {
      return res.status(404).json({ message: 'Booking business or service was not found' });
    }

    booking.razorpayPaymentId = paymentId;

    try {
      await confirmPaidBooking({ booking, business, service });
    } catch (confirmError) {
      // The customer has paid but the slot went to someone else while they were
      // at checkout. Give the money straight back.
      let refunded = false;
      try {
        await razorpay.payments.refund(paymentId, { amount: booking.amount });
        refunded = true;
      } catch (refundError) {
        console.error('Razorpay refund failed for payment', paymentId, refundError.error?.description || refundError.message);
      }

      return res.status(409).json({
        message: refunded
          ? 'That slot was taken while you were paying. Your payment has been refunded. Please pick another time'
          : 'That slot was taken while you were paying. Please contact the business for a refund',
      });
    }

    res.json({ message: 'Booking confirmed', bookingId: booking._id });
  } catch (error) {
    console.error('Razorpay verification failed:', error.error?.description || error.message);
    res.status(500).json({ message: 'Could not confirm the payment. If money was deducted, contact the business' });
  }
};

export const getBookingStatus = async (req, res) => {
  try {
    const sessionId = cleanText(req.query.session_id, 200);
    const bookingId = cleanText(req.query.booking_id, 24);
    const token = cleanText(req.query.token, 64);

    // A Stripe session id is unguessable on its own. A booking id is not, so it
    // must come with the token that was given to whoever made the booking.
    if (!sessionId && !(bookingId && token)) {
      return res.status(400).json({ message: 'Booking identifier is required' });
    }
    const query = sessionId ? { stripeSessionId: sessionId } : { _id: bookingId, accessToken: token };

    let booking = await Booking.findOne(query).populate('serviceId', 'name duration price');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (sessionId && booking.status === 'pending_payment') {
      const stripe = await getStripe();
      if (!stripe) {
        return res.status(503).json({ message: 'Stripe payments are not configured yet' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        booking.status = 'payment_failed';
        booking.paymentStatus = 'failed';
        await booking.save();
        return res.status(402).json({ message: 'Payment was not successful. No booking was created.' });
      }

      const [business, service] = await Promise.all([
        User.findById(booking.userId),
        Service.findById(booking.serviceId),
      ]);

      if (!business || !service) {
        return res.status(404).json({ message: 'Booking business or service was not found' });
      }

      await confirmPaidBooking({ booking, business, service, session });
      booking = await Booking.findById(booking._id).populate('serviceId', 'name duration price');
    }

    res.json({ booking: toPublicBooking(booking) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const cancelPublicBookingPayment = async (req, res) => {
  try {
    const bookingId = cleanText(req.body.booking_id, 24);
    const token = cleanText(req.body.token, 64);

    if (!bookingId || !token) {
      return res.status(400).json({ message: 'Booking identifier is required' });
    }

    // Only the person who started this checkout holds the token.
    const booking = await Booking.findOne({ _id: bookingId, accessToken: token, status: 'pending_payment' });
    if (!booking) {
      return res.json({ message: 'No pending booking to cancel' });
    }

    booking.status = 'payment_failed';
    booking.paymentStatus = 'failed';
    await booking.save();

    res.json({ message: 'Payment was not completed. No booking was created.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
