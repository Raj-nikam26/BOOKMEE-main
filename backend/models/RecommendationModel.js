import mongoose from 'mongoose';

// A record of the last training run. The model itself lives in the
// BusinessNeighbours collection and in each business's popularity field.
const recommendationModelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  trainedAt: { type: Date, required: true },
  stats: { type: Object, default: {} },
});

export default mongoose.model('RecommendationModel', recommendationModelSchema);
