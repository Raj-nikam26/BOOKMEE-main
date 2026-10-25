import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'rejected'],
      default: 'pending',
    },
    payoutSnapshot: { type: Object, default: {} },
    adminNote: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Withdrawal', withdrawalSchema);
