import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Set when the booking was made by a logged-in customer account.
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerAvatar: {
      type: String,
      default: 'A1.png',
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_payment', 'confirmed', 'cancelled', 'payment_failed'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid', 'failed'],
      default: 'not_required',
    },
    stripeSessionId: {
      type: String,
      default: '',
      index: true,
    },
    // Random secret given only to the person who made the booking. The public
    // status and cancel endpoints require it, so knowing or guessing a booking
    // id is not enough to read or change someone else's booking.
    accessToken: {
      type: String,
      default: '',
      select: false,
    },
    // Which gateway took the payment: 'razorpay', 'stripe' or 'demo'.
    paymentProvider: {
      type: String,
      default: '',
    },
    razorpayOrderId: {
      type: String,
      default: '',
      index: true,
    },
    // Needed to refund the payment later.
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
    platformFeeAmount: {
      type: Number,
      default: 0,
    },
    providerPayoutAmount: {
      type: Number,
      default: 0,
    },
    payoutStatus: {
      type: String,
      enum: ['not_required', 'pending', 'available', 'withdrawn'],
      default: 'not_required',
    },
    currency: {
      type: String,
      default: 'inr',
    },
    googleEventId: {
      type: String,
      default: '',
    },
    customerCalendarUrl: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    // When the booking became confirmed (immediately for free bookings, after
    // payment for paid ones). The business dashboard polls on this.
    confirmedAt: {
      type: Date,
    },
    // Set when the customer cancels, so the business can be told.
    cancelledByCustomerAt: {
      type: Date,
    },
    isRescheduled: {
      type: Boolean,
      default: false,
    },
    rescheduleCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// The business app asks "anything new since time X?" every few seconds.
bookingSchema.index({ userId: 1, confirmedAt: -1 });
bookingSchema.index({ userId: 1, cancelledByCustomerAt: -1 });

// Last line of defence against double booking: two requests that pass the
// availability check at the same moment cannot both save the same start time.
bookingSchema.index(
  { userId: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'pending'] } } }
);

export default mongoose.model('Booking', bookingSchema);
