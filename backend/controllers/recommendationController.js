import { getCategoryLabel } from '../constants/categories.js';
import Customer from '../models/Customer.js';
import { getCardsByIds, getTopCards } from '../utils/businessCards.js';
import {
  diversify,
  getCategoryAffinity,
  loadCustomerHistory,
  loadNeighbours,
  rankCandidates,
} from '../utils/recommender.js';

const SHELF_SIZE = 8;
const SEED_BUSINESSES = 15; // how many of the customer's businesses seed the candidate list
const POPULAR_PER_CATEGORY = 12;
const CATEGORIES_TO_EXPAND = 4;
const GLOBAL_POPULAR = 24;
const MIN_REVIEWS_FOR_TOP_RATED = 5; // a single 5-star review should not top the list

const SORT_BY_RATING = { ratingAverage: -1, ratingCount: -1, _id: 1 };
const SORT_BY_NEWEST = { createdAt: -1, _id: 1 };

// A shelf with a `tab` label is shown as one tab of the single "Explore" row;
// shelves without one get a row of their own.
const shelf = (id, title, subtitle, items, tab = null) => ({ id, title, subtitle, items, tab });

/**
 * Shelves everyone sees, logged in or not.
 */
const getGeneralShelves = async () => {
  const [trending, topRated, newest] = await Promise.all([
    getTopCards({ limit: SHELF_SIZE }),
    getTopCards({ filter: { ratingCount: { $gte: MIN_REVIEWS_FOR_TOP_RATED } }, sort: SORT_BY_RATING, limit: SHELF_SIZE }),
    getTopCards({ sort: SORT_BY_NEWEST, limit: SHELF_SIZE }),
  ]);

  return [
    shelf('trending', 'Popular right now', 'What customers are booking most.', trending, 'Popular'),
    shelf('top-rated', 'Top rated', 'Highest rated by customers who booked.', topRated, 'Top rated'),
    shelf('new', 'New on BookMe', 'Recently joined businesses.', newest, 'New'),
  ];
};

/**
 * Home page recommendations as a list of shelves.
 *
 * For a logged-in customer the work is done in two stages:
 *  1. Candidate generation: a few hundred businesses pulled through indexes.
 *  2. Ranking and diversity (utils/recommender.js) on just those candidates.
 * So the cost does not grow with the total number of businesses.
 */
export const getRecommendations = async (req, res) => {
  try {
    const customer = req.customer ? await Customer.findById(req.customer.id).lean() : null;
    const generalShelves = await getGeneralShelves();

    if (!customer) {
      return res.json({ personalized: false, shelves: generalShelves.filter((item) => item.items.length > 0) });
    }

    // ---- Stage 1: candidate generation ----
    const history = await loadCustomerHistory(customer._id);
    const userItems = new Map([...history].map(([id, entry]) => [id, entry.weight]));
    const historyIds = [...history.keys()];

    const seedIds = [...history]
      .sort(([, a], [, b]) => b.weight - a.weight)
      .slice(0, SEED_BUSINESSES)
      .map(([id]) => id);

    const [similarities, historyCards] = await Promise.all([
      loadNeighbours(seedIds),
      getCardsByIds(historyIds),
    ]);

    // Category taste needs the categories of what the customer already used.
    const categoryOf = new Map([...historyCards].map(([id, card]) => [id, card.category]));
    const affinity = getCategoryAffinity({ userItems, interests: customer.interests, categoryOf });
    const favouriteCategories = [...affinity]
      .sort(([, a], [, b]) => b - a)
      .slice(0, CATEGORIES_TO_EXPAND)
      .map(([category]) => category);

    const neighbourIds = Object.values(similarities).flat().map((neighbour) => neighbour.id);
    const [neighbourCards, globalPopular, ...popularByCategory] = await Promise.all([
      getCardsByIds([...new Set(neighbourIds)]),
      getTopCards({ limit: GLOBAL_POPULAR }),
      ...favouriteCategories.map((category) => getTopCards({ filter: { category }, limit: POPULAR_PER_CATEGORY })),
    ]);

    const cards = new Map([...historyCards, ...neighbourCards]);
    [...globalPopular, ...popularByCategory.flat()].forEach((card) => cards.set(card.id, card));
    cards.forEach((card, id) => categoryOf.set(id, card.category));

    // A business the customer already booked belongs on "Book again", not in new picks.
    const bookedIds = new Set([...history].filter(([, entry]) => entry.booked).map(([id]) => id));
    const candidates = [...cards.keys()].filter((id) => !bookedIds.has(id));

    // ---- Stage 2: ranking and diversity ----
    const model = {
      similarities,
      popularity: Object.fromEntries([...cards].map(([id, card]) => [id, card.popularity])),
    };
    const ranked = rankCandidates({ model, userItems, interests: customer.interests, categoryOf, candidates });

    const describeReason = (reason) => {
      const source = reason.type === 'similar' ? cards.get(reason.sourceId) : null;
      if (source) {
        return `Because you ${history.get(reason.sourceId).booked ? 'booked' : 'viewed'} ${source.businessName}`;
      }
      if (reason.type === 'category') return `Because you like ${getCategoryLabel(reason.category)}`;
      return 'Popular on BookMe';
    };

    const topPicks = diversify(ranked, categoryOf, SHELF_SIZE)
      .map(({ id, reason }) => ({ ...cards.get(id), reason: describeReason(reason) }));
    const shown = new Set(topPicks.map((card) => card.id));

    const shelves = [];
    const isPersonal = history.size > 0 || customer.interests.length > 0;

    shelves.push(shelf(
      'top-picks',
      isPersonal ? `Top picks for you, ${customer.name.split(' ')[0]}` : 'Popular picks to get you started',
      isPersonal
        ? 'A mix based on your interests and what you have viewed and booked.'
        : 'Pick your interests or open a few businesses and this becomes personal.',
      topPicks
    ));

    // Book again: most recently booked first.
    const bookAgain = [...history]
      .filter(([id, entry]) => entry.booked && cards.has(id))
      .sort(([, a], [, b]) => b.lastAt - a.lastAt)
      .slice(0, SHELF_SIZE)
      .map(([id]) => cards.get(id));
    shelves.push(shelf('book-again', 'Book again', 'Businesses you have booked before.', bookAgain));

    // "Because you booked X": neighbours of the most recent business they engaged with.
    const [recentId, recentEntry] = [...history]
      .filter(([id]) => cards.has(id) && similarities[id])
      .sort(([, a], [, b]) => b.lastAt - a.lastAt)[0] || [];
    if (recentId) {
      const related = similarities[recentId]
        .map((neighbour) => neighbour.id)
        .filter((id) => cards.has(id) && !bookedIds.has(id) && !shown.has(id))
        .slice(0, SHELF_SIZE)
        .map((id) => cards.get(id));
      related.forEach((card) => shown.add(card.id));

      shelves.push(shelf(
        'because-you',
        `Because you ${recentEntry.booked ? 'booked' : 'viewed'} ${cards.get(recentId).businessName}`,
        'Customers who used it also chose these.',
        related,
        `Like ${cards.get(recentId).businessName}`
      ));
    }

    // Popular in the two categories they like most.
    favouriteCategories.slice(0, 2).forEach((category, index) => {
      const items = popularByCategory[index]
        .filter((card) => !bookedIds.has(card.id) && !shown.has(card.id))
        .slice(0, SHELF_SIZE);
      shelves.push(shelf(
        `category-${category}`,
        `Popular in ${getCategoryLabel(category)}`,
        'Most booked in a category you like.',
        items,
        getCategoryLabel(category)
      ));
    });

    res.json({
      personalized: isPersonal,
      shelves: [...shelves, ...generalShelves].filter((item) => item.items.length > 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
