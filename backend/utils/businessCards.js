import { getCategoryLabel } from '../constants/categories.js';
import User from '../models/User.js';

const CARD_FIELDS = 'slug name businessName businessDescription brandTheme brandAccent category '
  + 'startingPrice serviceCount listing.services ratingAverage ratingCount popularity createdAt';

const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 24;
const MAX_PAGE = 100; // deep skip() pages are slow; nobody browses past this
const SERVICES_PER_CARD = 3;
const MIN_PRICES_FOR_INSIGHT = 3;

// _id is the tie-breaker so pages never repeat or skip a business.
const SORTS = {
  recommended: { popularity: -1, _id: 1 },
  rating: { ratingAverage: -1, ratingCount: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  'price-low': { comparePrice: 1, _id: 1 },
  'price-high': { comparePrice: -1, _id: 1 },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turns a business document into the card the marketplace shows.
 * With a search matcher, services that match are listed first and the cheapest
 * match is returned as matchedService so prices can be compared across cards.
 */
export const toCard = (user, matcher = null) => {
  const services = user.listing?.services || [];
  const matching = matcher ? services.filter((service) => matcher.test(service.name)) : [];
  const ordered = [...matching, ...services.filter((service) => !matching.includes(service))];

  return {
    id: String(user._id),
    slug: user.slug,
    businessName: user.businessName || user.name,
    businessDescription: user.businessDescription,
    brandTheme: user.brandTheme,
    brandAccent: user.brandAccent,
    category: user.category,
    categoryLabel: getCategoryLabel(user.category),
    serviceCount: user.serviceCount,
    startingPrice: user.startingPrice,
    ratingAverage: user.ratingAverage || 0,
    ratingCount: user.ratingCount || 0,
    services: ordered.slice(0, SERVICES_PER_CARD),
    matchedService: matching[0] || null, // services are stored cheapest first
  };
};

/**
 * Cards for a known set of businesses (used by recommendations). Unlisted ones are dropped.
 */
export const getCardsByIds = async (ids) => {
  if (ids.length === 0) return new Map();

  const users = await User.find({ _id: { $in: ids }, isListed: true }).select(CARD_FIELDS).lean();
  return new Map(users.map((user) => [String(user._id), { ...toCard(user), popularity: user.popularity || 0 }]));
};

/**
 * A short list of listed businesses in a given order, e.g. the most popular in a category.
 */
export const getTopCards = async ({ filter = {}, sort = SORTS.recommended, limit = 8 }) => {
  const users = await User.find({ isListed: true, ...filter }).sort(sort).limit(limit).select(CARD_FIELDS).lean();
  return users.map((user) => ({ ...toCard(user), popularity: user.popularity || 0 }));
};

/**
 * How the services matching this search are priced across every matching business.
 */
const getPriceStats = async (filter, pattern) => {
  const [stats] = await User.aggregate([
    { $match: filter },
    { $limit: 5000 },
    { $unwind: '$listing.services' },
    { $match: { 'listing.services.name': { $regex: pattern, $options: 'i' } } },
    {
      $group: {
        _id: null,
        average: { $avg: '$listing.services.price' },
        lowest: { $min: '$listing.services.price' },
        count: { $sum: 1 },
      },
    },
  ]);

  return stats && stats.count >= MIN_PRICES_FOR_INSIGHT ? stats : null;
};

const describePrice = (price, stats) => {
  if (!stats) return null;
  if (price <= stats.lowest) return { type: 'lowest', label: 'Lowest price' };

  const saving = (stats.average - price) / stats.average;
  if (saving >= 0.1) return { type: 'below', label: `${Math.round(saving * 100)}% below average` };
  if (saving <= -0.15) return { type: 'above', label: `${Math.round(-saving * 100)}% above average` };
  return { type: 'average', label: 'Around average price' };
};

/**
 * One page of the marketplace directory.
 *
 * Search is a substring match on a prepared lowercase field. That is correct and
 * fine into the tens of thousands of businesses; beyond that, replace the search
 * filter here with a search engine (Atlas Search, Elasticsearch, Meilisearch).
 * Nothing else in the app needs to change.
 */
export const searchBusinesses = async ({ search = '', category, sort = 'recommended', page = 1, limit = PAGE_SIZE } = {}) => {
  const pageSize = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const pageNumber = Math.min(Math.max(Number(page) || 1, 1), MAX_PAGE);
  const sortKey = SORTS[sort] ? sort : 'recommended';
  const pattern = search ? escapeRegex(search.toLowerCase()) : '';
  const matcher = pattern ? new RegExp(pattern, 'i') : null;

  const filter = { isListed: true };
  if (category) filter.category = category;
  if (pattern) filter['listing.searchText'] = { $regex: pattern };

  const pipeline = [{ $match: filter }];
  let sortSpec = SORTS[sortKey];

  if (sortKey.startsWith('price')) {
    const direction = sortSpec.comparePrice;

    if (pattern) {
      // When searching "haircut", compare haircut prices, not each business's
      // cheapest unrelated service. Computed per match, so it cannot use an index.
      pipeline.push({
        $addFields: {
          // Businesses that actually offer a matching service come before ones
          // that only matched on their name or category.
          offersMatch: {
            $anyElementTrue: [{
              $map: {
                input: '$listing.services',
                in: { $regexMatch: { input: '$$this.name', regex: pattern, options: 'i' } },
              },
            }],
          },
          comparePrice: {
            $ifNull: [
              {
                $min: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$listing.services',
                        cond: { $regexMatch: { input: '$$this.name', regex: pattern, options: 'i' } },
                      },
                    },
                    in: '$$this.price',
                  },
                },
              },
              '$startingPrice',
            ],
          },
        },
      });
      sortSpec = { offersMatch: -1, comparePrice: direction, _id: 1 };
    } else {
      sortSpec = { startingPrice: direction, _id: 1 }; // indexed
    }
  }

  pipeline.push(
    { $sort: sortSpec },
    { $skip: (pageNumber - 1) * pageSize },
    { $limit: pageSize },
  );

  const [users, total, priceStats] = await Promise.all([
    User.aggregate(pipeline).allowDiskUse(true),
    User.countDocuments(filter),
    pattern ? getPriceStats(filter, pattern) : null,
  ]);

  const businesses = users.map((user) => {
    const card = toCard(user, matcher);
    return {
      ...card,
      priceInsight: card.matchedService ? describePrice(card.matchedService.price, priceStats) : null,
    };
  });

  return {
    businesses,
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    hasMore: pageNumber * pageSize < total,
    priceStats: priceStats
      ? { average: Math.round(priceStats.average), lowest: priceStats.lowest, count: priceStats.count }
      : null,
  };
};
