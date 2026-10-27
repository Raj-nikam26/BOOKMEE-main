import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Interaction from '../models/Interaction.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { sendBookingNotification } from '../utils/bookingNotifications.js';
import { cancelBookingCalendarEvent } from '../utils/googleCalendar.js';
import { refreshRating } from '../utils/ratings.js';

const PAGE_SIZE = 10;

const hasStarted = (booking) => new Date(`${booking.date}T${booking.startTime}:00`) <= new Date();

/**
 * The logged-in customer's bookings, newest appointment first, one page at a time.
 * ?when=upcoming|past
 */
export const listMyBookings = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const query = {
      customerId: req.customer.id,
      // Abandoned checkouts are not bookings.
      status: { $nin: ['pending_payment', 'payment_failed'] },
    };

    const isPast = req.query.when === 'past';
    if (isPast) {
      query.$or = [{ date: { $lt: todayKey } }, { status: 'cancelled' }];
    } else {
      query.date = { $gte: todayKey };
      query.status = { $in: ['confirmed', 'pending'] };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort({ date: isPast ? -1 : 1, startTime: isPast ? -1 : 1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate('serviceId', 'name duration icon')
        .populate('userId', 'businessName name slug brandTheme brandAccent category')
        .lean(),
      Booking.countDocuments(query),
    ]);

    const reviews = await Review.find({ bookingId: { $in: bookings.map((booking) => booking._id) } })
      .select('bookingId rating comment')
      .lean();
    const reviewByBooking = new Map(reviews.map((review) => [String(review.bookingId), review]));

    res.json({
      bookings: bookings.map((booking) => ({
        id: booking._id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        amount: booking.amount,
        notes: booking.notes,
        calendarUrl: booking.customerCalendarUrl,
        hasStarted: hasStarted(booking),
        service: booking.serviceId
          ? { name: booking.serviceId.name, duration: booking.serviceId.duration, icon: booking.serviceId.icon }
          : null,
        business: booking.userId
          ? {
            name: booking.userId.businessName || booking.userId.name,
            slug: booking.userId.slug,
            brandTheme: booking.userId.brandTheme,
            brandAccent: booking.userId.brandAccent,
          }
          : null,
        review: reviewByBooking.get(String(booking._id)) || null,
      })),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Small counts for the home page: how many bookings are coming up and how many
 * finished appointments are still waiting for a rating.
 */
export const getMyBookingSummary = async (req, res) => {
  try {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const mine = { customerId: req.customer.id, status: 'confirmed' };

    const [upcoming, finished] = await Promise.all([
      Booking.countDocuments({ ...mine, date: { $gte: todayKey } }),
      Booking.find({ ...mine, date: { $lte: todayKey } })
        .sort({ date: -1 })
        .limit(50)
        .select('date startTime')
        .lean(),
    ]);

    const started = finished.filter(hasStarted);
    const reviewed = await Review.countDocuments({ bookingId: { $in: started.map((booking) => booking._id) } });

    res.json({ upcoming, toReview: started.length - reviewed });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Lets a customer cancel their own upcoming booking.
 * Paid bookings are not cancelled here because that needs a refund, which the
 * business has to arrange.
 */
export const cancelMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.customer.id })
      .populate('serviceId', 'name duration price');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'This booking is already cancelled' });
    }
    if (hasStarted(booking)) {
      return res.status(400).json({ message: 'This appointment has already started and cannot be cancelled' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Paid bookings need a refund. Please contact the business to cancel' });
    }

    booking.status = 'cancelled';
    booking.cancelledByCustomerAt = new Date();
    await booking.save();

    // The slot is free again as soon as the status changes (slots only count
    // confirmed and pending bookings). Also stop treating it as a past booking
    // for recommendations.
    await Interaction.deleteMany({ bookingId: booking._id });

    const business = await User.findById(booking.userId);
    if (business) {
      cancelBookingCalendarEvent({ business, booking })
        .catch((error) => console.error('Google Calendar cancellation failed:', error.message));
      if (booking.serviceId) {
        sendBookingNotification({ business, service: booking.serviceId, booking, type: 'cancelled' })
          .catch((error) => console.error('Booking cancellation email failed:', error.message));
      }
    }

    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Rates a booking after the appointment has taken place. One review per booking.
 */
export const reviewMyBooking = async (req, res) => {
  try {
    const rating = Math.round(Number(req.body.rating));
    const comment = String(req.body.comment || '').trim().slice(0, 500);

    if (!(rating >= 1 && rating <= 5)) {
      return res.status(400).json({ message: 'Choose a rating from 1 to 5 stars' });
    }

    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.customer.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status !== 'confirmed' || !hasStarted(booking)) {
      return res.status(400).json({ message: 'You can review a booking after the appointment' });
    }
    if (await Review.exists({ bookingId: booking._id })) {
      return res.status(409).json({ message: 'You have already reviewed this booking' });
    }

    const customer = await Customer.findById(req.customer.id).select('name').lean();
    const review = await Review.create({
      businessId: booking.userId,
      customerId: req.customer.id,
      bookingId: booking._id,
      customerName: customer?.name || booking.customerName,
      rating,
      comment,
    });

    await refreshRating(booking.userId);

    res.status(201).json({
      message: 'Thanks for your review',
      review: { rating: review.rating, comment: review.comment },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
