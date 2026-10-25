import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, default: 30 },
    price: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: 'C1.png' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Service', serviceSchema);
