import BusinessNeighbours from '../models/BusinessNeighbours.js';
import Interaction from '../models/Interaction.js';
import RecommendationModel from '../models/RecommendationModel.js';
import User from '../models/User.js';

/*
 * Recommender, in two stages like production systems:
 *
 *  1. Candidate generation (recommendationController): pull a few hundred
 *     plausible businesses from indexes - neighbours of what the customer used,
 *     the most popular in the categories they like, and the overall most popular.
 *  2. Ranking (this file): score those candidates and pick a varied top list.
 *
 * Three signals feed the score, each scaled to 0..1:
 *
 *  - Collaborative: "customers who used A also used B", learned by train().
 *  - Content: how much this customer likes the candidate's category.
 *  - Popularity: what everyone is booking. Carries customers with no history.
 *
 * Things that stop the list from collapsing onto one category:
 *
 *  - Diminishing returns: category taste grows with the log of activity, so the
 *    fifth interaction in a category adds far less than the first.
 *  - Interests picked at signup are a lasting prior, not overwritten by one booking.
 *  - Time decay: old activity counts for less.
 *  - Diversity re-ranking: each extra pick from a category is penalised, with a hard cap.
 *  - Confidence: the collaborative signal is scaled down for customers with little
 *    history, so a single booking cannot outweigh the interests they told us about.
 */

const MODEL_NAME = 'item-cf';
const INTERACTION_WEIGHTS = { view: 1, book: 5 };
const MAX_VIEW_WEIGHT = 3; // repeat views of one business stop adding weight after this
const NEIGHBOURS_PER_BUSINESS = 20;

const HALF_LIFE_DAYS = 45; // an interaction this old counts half as much
const PROFILE_HISTORY_LIMIT = 500; // most recent interactions used for one customer
const INTEREST_PRIOR = 2.5; // a category picked at signup, on the same log scale as activity

// "Customers like you also used" is unreliable when we know almost nothing about
// the customer, so it is trusted in proportion to how much history they have.
// One booking is worth 5, so this is roughly three bookings.
const HISTORY_FOR_FULL_COLLABORATIVE = 15;

const CATEGORY_REPEAT_PENALTY = 0.7; // score multiplier for each pick already taken from a category
const MAX_SHARE_PER_CATEGORY = 0.34; // of one recommendation list

export const BLEND = { collaborative: 0.5, content: 0.35, popularity: 0.15 };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

/**
 * All interactions as Map<customerId, Map<businessId, weight>>. Training data.
 */
export const loadPreferences = async (match = {}) => {
  const rows = await Interaction.aggregate([
    { $match: match },
    { $group: { _id: { customer: '$customerId', business: '$businessId', type: '$type' }, count: { $sum: 1 } } },
  ]).allowDiskUse(true);

  const preferences = new Map();
  rows.forEach(({ _id, count }) => {
    const customer = String(_id.customer);
    const business = String(_id.business);
    const weight = _id.type === 'book'
      ? count * INTERACTION_WEIGHTS.book
      : Math.min(count * INTERACTION_WEIGHTS.view, MAX_VIEW_WEIGHT);

    if (!preferences.has(customer)) preferences.set(customer, new Map());
    const items = preferences.get(customer);
    items.set(business, (items.get(business) || 0) + weight);
  });

  return preferences;
};

/**
 * Builds the model from a preference map: cosine similarity between every pair
 * of businesses that share at least one customer, plus a popularity score.
 */
export const buildModel = (preferences) => {
  const dotProducts = new Map(); // "a|b" -> sum of weightA * weightB
  const squaredNorms = new Map();
  const totals = new Map();

  preferences.forEach((items) => {
    const entries = [...items.entries()];

    entries.forEach(([business, weight]) => {
      squaredNorms.set(business, (squaredNorms.get(business) || 0) + weight * weight);
      totals.set(business, (totals.get(business) || 0) + weight);
    });

    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [a, weightA] = entries[i];
        const [b, weightB] = entries[j];
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        dotProducts.set(key, (dotProducts.get(key) || 0) + weightA * weightB);
      }
    }
  });

  const neighbours = {};
  dotProducts.forEach((dot, key) => {
    const [a, b] = key.split('|');
    const score = dot / (Math.sqrt(squaredNorms.get(a)) * Math.sqrt(squaredNorms.get(b)));

    (neighbours[a] ||= []).push({ id: b, score });
    (neighbours[b] ||= []).push({ id: a, score });
  });

  const similarities = {};
  Object.entries(neighbours).forEach(([business, list]) => {
    similarities[business] = list
      .sort((x, y) => y.score - x.score)
      .slice(0, NEIGHBOURS_PER_BUSINESS)
      .map(({ id, score }) => ({ id, score: Number(score.toFixed(4)) }));
  });

  const maxTotal = Math.max(1, ...totals.values());
  const popularity = {};
  totals.forEach((total, business) => {
    popularity[business] = Number((total / maxTotal).toFixed(4));
  });

  return { similarities, popularity };
};

/**
 * Trains on every interaction and saves the result: neighbour lists in their
 * own collection and a popularity score on each business.
 *
 * This runs in memory, which is right for a scheduled job up to a few hundred
 * thousand interactions. Past that, move training to an offline job (Spark,
 * implicit ALS) that writes the same two outputs; serving does not change.
 */
export const train = async () => {
  const preferences = await loadPreferences();
  const model = buildModel(preferences);
  const businessIds = Object.keys(model.popularity);

  await BusinessNeighbours.deleteMany({ businessId: { $nin: businessIds } });
  if (businessIds.length > 0) {
    await BusinessNeighbours.bulkWrite(businessIds.map((id) => ({
      updateOne: {
        filter: { businessId: id },
        update: { neighbours: model.similarities[id] || [] },
        upsert: true,
      },
    })));
  }

  await User.updateMany({ _id: { $nin: businessIds }, popularity: { $gt: 0 } }, { popularity: 0 });
  if (businessIds.length > 0) {
    await User.bulkWrite(businessIds.map((id) => ({
      updateOne: { filter: { _id: id }, update: { popularity: model.popularity[id] } },
    })));
  }

  const stats = {
    customers: preferences.size,
    businesses: businessIds.length,
    interactions: await Interaction.estimatedDocumentCount(),
  };

  await RecommendationModel.findOneAndUpdate(
    { name: MODEL_NAME },
    { stats, trainedAt: new Date() },
    { upsert: true }
  );

  return stats;
};

// ---------------------------------------------------------------------------
// Serving
// ---------------------------------------------------------------------------

/**
 * What one customer has done recently, with older activity counting for less.
 * Returns Map<businessId, { weight, booked, lastAt }>.
 */
export const loadCustomerHistory = async (customerId) => {
  const rows = await Interaction.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(PROFILE_HISTORY_LIMIT)
    .select('businessId type createdAt')
    .lean();

  const history = new Map();
  const now = Date.now();

  rows.forEach((row) => {
    const id = String(row.businessId);
    const entry = history.get(id) || { viewWeight: 0, bookWeight: 0, booked: false, lastAt: row.createdAt };
    const decay = 0.5 ** ((now - row.createdAt.getTime()) / MS_PER_DAY / HALF_LIFE_DAYS);

    if (row.type === 'book') {
      entry.bookWeight += INTERACTION_WEIGHTS.book * decay;
      entry.booked = true;
    } else {
      entry.viewWeight = Math.min(entry.viewWeight + INTERACTION_WEIGHTS.view * decay, MAX_VIEW_WEIGHT);
    }

    history.set(id, entry);
  });

  history.forEach((entry) => {
    entry.weight = entry.viewWeight + entry.bookWeight;
  });

  return history;
};

/**
 * Neighbour lists for a set of businesses, as { businessId: [{ id, score }] }.
 */
export const loadNeighbours = async (businessIds) => {
  if (businessIds.length === 0) return {};

  const docs = await BusinessNeighbours.find({ businessId: { $in: businessIds } }).lean();
  return Object.fromEntries(docs.map((doc) => [String(doc.businessId), doc.neighbours]));
};

/**
 * How much a customer likes each category, as Map<categoryId, score>.
 * Activity is summed per category and then log-scaled, so taste broadens with
 * new categories faster than it deepens in one.
 */
export const getCategoryAffinity = ({ userItems, interests = [], categoryOf }) => {
  const activity = new Map();
  userItems.forEach((weight, business) => {
    const category = categoryOf.get(business);
    if (category) activity.set(category, (activity.get(category) || 0) + weight);
  });

  const affinity = new Map(interests.map((category) => [category, INTEREST_PRIOR]));
  activity.forEach((total, category) => {
    affinity.set(category, (affinity.get(category) || 0) + Math.log1p(total));
  });

  return affinity;
};

const scaleToOne = (scores) => {
  const max = Math.max(0, ...scores.values());
  return max > 0 ? new Map([...scores].map(([id, value]) => [id, value / max])) : scores;
};

/**
 * Scores candidate businesses for one customer.
 *
 * @param {Object} model       { similarities: { id: [{ id, score }] }, popularity: { id: 0..1 } }
 * @param {Map}    userItems   businessId -> weight for this customer
 * @param {Array}  interests   category ids the customer picked
 * @param {Map}    categoryOf  businessId -> category id
 * @param {Array}  candidates  business ids that may be recommended
 * @returns {Array} [{ id, score, reason: { type, sourceId?, category? } }] best first
 */
export const rankCandidates = ({ model, userItems, interests = [], categoryOf, candidates }) => {
  const candidateSet = new Set(candidates);

  const collaborative = new Map();
  const strongestSource = new Map();
  userItems.forEach((weight, business) => {
    (model.similarities[business] || []).forEach(({ id, score }) => {
      if (!candidateSet.has(id)) return;
      const contribution = score * weight;
      collaborative.set(id, (collaborative.get(id) || 0) + contribution);
      if (contribution > (strongestSource.get(id)?.contribution || 0)) {
        strongestSource.set(id, { business, contribution });
      }
    });
  });

  const affinity = getCategoryAffinity({ userItems, interests, categoryOf });
  const content = new Map();
  candidates.forEach((id) => {
    const score = affinity.get(categoryOf.get(id));
    if (score) content.set(id, score);
  });

  const collaborativeScores = scaleToOne(collaborative);
  const contentScores = scaleToOne(content);

  const historyWeight = [...userItems.values()].reduce((sum, weight) => sum + weight, 0);
  const confidence = Math.min(1, historyWeight / HISTORY_FOR_FULL_COLLABORATIVE);

  return candidates
    .map((id) => {
      const parts = {
        collaborative: BLEND.collaborative * confidence * (collaborativeScores.get(id) || 0),
        content: BLEND.content * (contentScores.get(id) || 0),
        popularity: BLEND.popularity * (model.popularity[id] || 0),
      };

      // The reason shown to the customer is whichever signal contributed most.
      let reason = { type: 'popular' };
      if (parts.collaborative > 0 && parts.collaborative >= parts.content && parts.collaborative >= parts.popularity) {
        reason = { type: 'similar', sourceId: strongestSource.get(id).business };
      } else if (parts.content > 0 && parts.content >= parts.popularity) {
        reason = { type: 'category', category: categoryOf.get(id) };
      }

      return { id, score: parts.collaborative + parts.content + parts.popularity, reason };
    })
    .sort((a, b) => b.score - a.score);
};

/**
 * Picks the final list from ranked candidates so it is not all one category:
 * every pick already taken from a category lowers the score of the next one,
 * and no category may fill more than MAX_SHARE_PER_CATEGORY of the list.
 */
export const diversify = (ranked, categoryOf, limit) => {
  const cap = Math.max(1, Math.ceil(limit * MAX_SHARE_PER_CATEGORY));
  const taken = new Map();
  const remaining = [...ranked];
  const picked = [];

  while (picked.length < limit && remaining.length > 0) {
    let bestIndex = -1;
    let bestScore = -1;

    remaining.forEach((item, index) => {
      const count = taken.get(categoryOf.get(item.id)) || 0;
      if (count >= cap) return;
      const adjusted = item.score * CATEGORY_REPEAT_PENALTY ** count;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = index;
      }
    });

    // Every remaining candidate is from a capped category: fill up in score order.
    if (bestIndex === -1) bestIndex = 0;

    const [item] = remaining.splice(bestIndex, 1);
    const category = categoryOf.get(item.id);
    taken.set(category, (taken.get(category) || 0) + 1);
    picked.push(item);
  }

  return picked;
};

export const getLastTraining = async () => (
  RecommendationModel.findOne({ name: MODEL_NAME }).lean()
);
