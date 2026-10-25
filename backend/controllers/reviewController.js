import Review from '../models/Review.js';

const PAGE_SIZE = 5;

/**
 * Reviews customers have left for the logged-in business, newest first.
 */
export const listMyReviews = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const query = { businessId: req.user.id };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select('customerName rating comment createdAt')
        .lean(),
      Review.countDocuments(query),
    ]);

    res.json({ reviews, total, page, hasMore: page * PAGE_SIZE < total });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
