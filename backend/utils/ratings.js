import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';

/**
 * Recalculates the average rating stored on one business.
 */
export const refreshRating = async (businessId) => {
  const [summary] = await Review.aggregate([
    { $match: { businessId: new mongoose.Types.ObjectId(String(businessId)) } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await User.updateOne({ _id: businessId }, {
    ratingAverage: summary ? Number(summary.average.toFixed(2)) : 0,
    ratingCount: summary?.count || 0,
  });
};
