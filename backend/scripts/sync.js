/*
 * Rebuilds the marketplace listing and rating stored on every business.
 * Run once after upgrading from a version that did not store them, or any time
 * the stored copies are suspected to be out of date.
 *
 *   npm run sync
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { refreshAllListings } from '../utils/listing.js';
import { refreshRating } from '../utils/ratings.js';

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookme');
await User.syncIndexes();

const count = await refreshAllListings();
for (const businessId of await User.distinct('_id')) {
  await refreshRating(businessId);
}

console.log(`Rebuilt ${count} business listings`);
await mongoose.disconnect();
