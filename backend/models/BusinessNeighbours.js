import mongoose from 'mongoose';

// Output of recommendation training: for one business, the businesses most
// often used by the same customers. One small document per business, so the
// model scales with the number of businesses instead of living in one document.
const businessNeighboursSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  neighbours: [
    {
      _id: false,
      id: { type: String, required: true },
      score: { type: Number, required: true },
    },
  ],
});

export default mongoose.model('BusinessNeighbours', businessNeighboursSchema);
