import mongoose from 'mongoose';

// A customer's rating of one completed booking. One review per booking.
const reviewSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    // Sample reviews created by the seed script have no booking behind them.
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    customerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

reviewSchema.index({ businessId: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: true } } });

export default mongoose.model('Review', reviewSchema);
