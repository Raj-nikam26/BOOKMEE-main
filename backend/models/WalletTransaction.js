import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
    type: {
      type: String,
      enum: ['booking_payout', 'withdrawal_hold', 'withdrawal_reversal'],
      required: true,
    },
    // Amount is stored in paise, always positive. The type decides the direction.
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['available', 'pending', 'reversed'],
      default: 'available',
    },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('WalletTransaction', walletTransactionSchema);
