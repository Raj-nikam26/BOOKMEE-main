import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    slots: [
      {
        _id: false,
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

availabilitySchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model('Availability', availabilitySchema);
