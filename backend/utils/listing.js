import { getCategoryLabel } from '../constants/categories.js';
import Service from '../models/Service.js';
import User from '../models/User.js';

const MAX_LISTED_SERVICES = 30;

/**
 * Rebuilds the marketplace listing stored on one business.
 * Call it after anything that changes what a customer would see on a card:
 * a service being added, edited, hidden or deleted, or the profile being saved.
 */
export const refreshListing = async (userId) => {
  const [user, services] = await Promise.all([
    User.findById(userId).select('name businessName businessDescription category').lean(),
    Service.find({ userId, isActive: true, isDeleted: { $ne: true } })
      .select('name duration price icon')
      .sort({ price: 1 })
      .limit(MAX_LISTED_SERVICES)
      .lean(),
  ]);

  if (!user) return;

  const searchText = [
    user.businessName || user.name,
    user.businessDescription,
    getCategoryLabel(user.category),
    ...services.map((service) => service.name),
  ].join(' ').toLowerCase();

  await User.updateOne({ _id: userId }, {
    isListed: services.length > 0,
    serviceCount: services.length,
    startingPrice: services[0]?.price ?? 0,
    listing: {
      services: services.map(({ name, duration, price, icon }) => ({ name, duration, price, icon })),
      searchText,
    },
  });
};

/**
 * Rebuilds every listing. Used after seeding and for data created before
 * listings existed (npm run sync).
 */
export const refreshAllListings = async () => {
  let count = 0;
  for await (const user of User.find().select('_id').lean().cursor()) {
    await refreshListing(user._id);
    count += 1;
  }
  return count;
};
