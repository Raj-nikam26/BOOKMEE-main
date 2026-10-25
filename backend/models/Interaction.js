import mongoose from 'mongoose';

// One row per customer action. This is the training data for recommendations.
const interactionSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['view', 'book'], required: true },
    // Set for 'book' rows so the signal can be withdrawn if the booking is cancelled.
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('Interaction', interactionSchema);
