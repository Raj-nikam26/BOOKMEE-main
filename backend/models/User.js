import mongoose from 'mongoose';
import { CATEGORY_IDS, DEFAULT_CATEGORY } from '../constants/categories.js';

const payoutDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountLast4: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    upiId: { type: String, default: '' },
    isComplete: { type: Boolean, default: false },
    updatedAt: { type: Date },
  },
  { _id: false }
);

// A copy of what the marketplace needs to show a business card, kept on the
// business itself so listing pages never have to read the services collection.
// Rebuilt by utils/listing.js whenever services or profile details change.
const listingSchema = new mongoose.Schema(
  {
    services: [
      {
        _id: false,
        name: String,
        duration: Number,
        price: Number,
        icon: String,
      },
    ],
    // Lowercase business name, description, category and service names, for search.
    searchText: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORY_IDS, default: DEFAULT_CATEGORY, index: true },
    businessDescription: { type: String, default: '', trim: true },
    brandTheme: { type: String, default: 'emerald' },
    brandAccent: { type: String, default: '#047857' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    googleCalendarConnected: { type: Boolean, default: false },
    googleCalendarId: { type: String, default: 'primary' },
    googleRefreshToken: { type: String, default: '' },
    payoutDetails: { type: payoutDetailsSchema, default: () => ({}) },

    // Marketplace listing (see listingSchema above)
    isListed: { type: Boolean, default: false }, // has at least one bookable service
    serviceCount: { type: Number, default: 0 },
    startingPrice: { type: Number, default: 0 },
    listing: { type: listingSchema, default: () => ({}) },

    // Written by the recommendation training job, 0..1
    popularity: { type: Number, default: 0 },

    // Written whenever a review is added
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Seeded sample business (npm run seed), safe to delete.
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One index per way the marketplace sorts, so every listing page is an index walk.
userSchema.index({ isListed: 1, popularity: -1, _id: 1 });
userSchema.index({ isListed: 1, category: 1, popularity: -1, _id: 1 });
userSchema.index({ isListed: 1, startingPrice: 1, _id: 1 });
userSchema.index({ isListed: 1, ratingAverage: -1, ratingCount: -1, _id: 1 });
userSchema.index({ isListed: 1, createdAt: -1, _id: 1 });

export default mongoose.model('User', userSchema);
