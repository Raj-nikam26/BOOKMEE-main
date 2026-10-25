/*
 * Trains the recommendation model and reports how good it is.
 *
 *   npm run train
 *
 * Evaluation is "leave one out": for each customer we hide one business they
 * booked, train on everything else, and check whether the hidden business shows
 * up in that customer's top 5 recommendations (HitRate@5). The same test is run
 * for a plain "most popular" list so there is a baseline to compare against.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import Customer from '../models/Customer.js';
import User from '../models/User.js';
import { buildModel, diversify, loadPreferences, rankCandidates, train } from '../utils/recommender.js';

const TOP_K = 5;
const BOOKED_WEIGHT = 5; // one booking, see INTERACTION_WEIGHTS in utils/recommender.js

// Small seeded random generator so the evaluation gives the same result every run.
const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const evaluate = async () => {
  const random = createRandom(42);
  const [preferences, businesses, customers] = await Promise.all([
    loadPreferences(),
    User.find().select('category').lean(),
    Customer.find().select('interests').lean(),
  ]);

  const categoryOf = new Map(businesses.map((business) => [String(business._id), business.category]));
  const interestsOf = new Map(customers.map((customer) => [String(customer._id), customer.interests]));
  const allBusinessIds = [...categoryOf.keys()];

  // Hide one booked business for every customer with enough history.
  const heldOut = new Map();
  const trainingPreferences = new Map();
  preferences.forEach((items, customer) => {
    const booked = [...items].filter(([, weight]) => weight >= BOOKED_WEIGHT).map(([id]) => id);
    const remaining = new Map(items);

    if (items.size >= 3 && booked.length >= 2) {
      const hidden = booked[Math.floor(random() * booked.length)];
      remaining.delete(hidden);
      heldOut.set(customer, hidden);
    }

    trainingPreferences.set(customer, remaining);
  });

  const model = buildModel(trainingPreferences);
  const mostPopular = [...allBusinessIds].sort((a, b) => (model.popularity[b] || 0) - (model.popularity[a] || 0));

  let hybridHits = 0;
  let popularityHits = 0;

  heldOut.forEach((hidden, customer) => {
    const userItems = trainingPreferences.get(customer);
    const candidates = allBusinessIds.filter((id) => !userItems.has(id));

    // Same ranking and diversity step the live site uses.
    const hybridTop = diversify(
      rankCandidates({
        model,
        userItems,
        interests: interestsOf.get(customer) || [],
        categoryOf,
        candidates,
      }),
      categoryOf,
      TOP_K,
    );

    if (hybridTop.some((item) => item.id === hidden)) hybridHits += 1;
    if (mostPopular.filter((id) => !userItems.has(id)).slice(0, TOP_K).includes(hidden)) popularityHits += 1;
  });

  const tested = heldOut.size;
  return {
    tested,
    hybridHitRate: tested ? hybridHits / tested : 0,
    popularityHitRate: tested ? popularityHits / tested : 0,
  };
};

export const trainAndReport = async () => {
  const evaluation = await evaluate();
  const stats = await train();
  const percent = (value) => `${(value * 100).toFixed(1)}%`;

  console.log('Recommendation model trained');
  console.log(`  Data:       ${stats.interactions} interactions, ${stats.customers} customers, ${stats.businesses} businesses`);
  if (evaluation.tested === 0) {
    console.log('  Evaluation: not enough booking history yet to test accuracy');
  } else {
    console.log(`  Evaluation: leave-one-out on ${evaluation.tested} customers, HitRate@${TOP_K}`);
    console.log(`    Hybrid recommender:   ${percent(evaluation.hybridHitRate)}`);
    console.log(`    Most-popular baseline: ${percent(evaluation.popularityHitRate)}`);
  }
};

// Run directly: node scripts/train.js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookme');
  await trainAndReport();
  await mongoose.disconnect();
}
