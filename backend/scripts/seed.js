/*
 * Fills the database with sample data so the marketplace and the recommender
 * have something to work with.
 *
 *   npm run seed         96 sample businesses, 600 sample customers, their
 *                        browsing/booking history and reviews, then trains the model
 *   npm run seed:clear   removes everything this script created
 *
 * Only documents marked isDemo are ever deleted. Real accounts are not touched.
 * The history is written to the Interaction collection only: no Booking
 * documents are created, so dashboards, wallets and admin revenue stay real.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { DEFAULT_CATEGORY } from '../constants/categories.js';
import Availability from '../models/Availability.js';
import Customer from '../models/Customer.js';
import Interaction from '../models/Interaction.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import { refreshAllListings } from '../utils/listing.js';
import { refreshRating } from '../utils/ratings.js';
import { slugify } from '../utils/slugify.js';
import { trainAndReport } from './train.js';

const CUSTOMER_COUNT = 600;
const BUSINESSES_PER_CATEGORY = 12;
const REVIEW_SHARE = 0.35; // of sample bookings that leave a review
const HISTORY_DAYS = 60;
const BOOKING_SHARE = 0.3; // the rest of the history is page views
const ON_PREFERENCE_SHARE = 0.8; // how often a customer stays in a category they like

// [name, duration in minutes, price in rupees]
const CATALOGUE = {
  'health-wellness': {
    description: 'Caring, professional support for your body and mind.',
    businesses: ['Serene Mind Clinic', 'Wellspring Physiotherapy', 'NutriBalance Diet Studio', 'Calm Space Counselling', 'Ayur Roots Wellness'],
    services: [['Consultation', 30, 500], ['Therapy Session', 60, 1200], ['Follow-up Visit', 20, 300], ['Diet Plan', 45, 800], ['Physio Session', 45, 700]],
  },
  'beauty-salon': {
    description: 'Look and feel your best with our expert stylists.',
    businesses: ['Glow & Co Salon', 'Urban Shears', 'Blush Bridal Studio', 'The Nail Bar', 'Velvet Touch Spa'],
    services: [['Haircut', 30, 300], ['Hair Colour', 90, 1800], ['Facial', 60, 900], ['Manicure', 45, 500], ['Bridal Makeup Trial', 120, 3000]],
  },
  'fitness-yoga': {
    description: 'Build strength, flexibility and calm at your own pace.',
    businesses: ['Sunrise Yoga Shala', 'IronCore Personal Training', 'FlexFit Pilates', 'Zen Flow Studio', 'Stride Running Coach'],
    services: [['Yoga Class', 60, 300], ['Personal Training', 60, 800], ['Pilates Session', 45, 600], ['Fitness Assessment', 30, 0], ['Guided Meditation', 30, 200]],
  },
  education: {
    description: 'Patient one-to-one teaching that gets results.',
    businesses: ['BrightPath Tutors', 'CodeCraft Academy', 'LinguaLeap Language Coaching', 'MathWhiz Classes', 'Exam Edge Mentoring'],
    services: [['Maths Tuition', 60, 400], ['Coding Lesson', 60, 700], ['Spoken English', 45, 350], ['Doubt Clearing', 30, 200], ['Career Counselling', 45, 600]],
  },
  consulting: {
    description: 'Practical advice to help your business grow.',
    businesses: ['ScaleUp Advisors', 'BrandBloom Marketing', 'PitchPerfect Startup Mentors', 'HR Compass', 'DataSense Analytics'],
    services: [['Strategy Call', 60, 2500], ['Marketing Audit', 90, 4000], ['Pitch Deck Review', 45, 1500], ['Discovery Call', 30, 0], ['HR Consultation', 60, 2000]],
  },
  'home-services': {
    description: 'Reliable help for everything around the house.',
    businesses: ['SparkClean Home Care', 'FixIt Handyman', 'CoolBreeze AC Service', 'GreenThumb Gardening', 'PestAway Solutions'],
    services: [['Deep Cleaning', 120, 1500], ['AC Service', 60, 600], ['Plumbing Visit', 45, 400], ['Electrical Repair', 45, 450], ['Garden Care', 90, 800]],
  },
  'legal-finance': {
    description: 'Clear answers on law, tax and money.',
    businesses: ['LexPoint Legal', 'TaxEase Consultants', 'WealthWise Planners', 'ClearBooks Accounting', 'StartRight Company Registration'],
    services: [['Legal Consultation', 45, 1500], ['Tax Filing', 60, 1200], ['Financial Planning', 60, 2000], ['GST Advice', 30, 800], ['Free Intro Call', 15, 0]],
  },
  'pet-care': {
    description: 'Gentle, loving care for your pets.',
    businesses: ['Happy Paws Grooming', 'VetCare Clinic', 'Pawsitive Training', 'Whiskers Pet Spa', 'TailWag Dog Walking'],
    services: [['Pet Grooming', 60, 700], ['Vet Consultation', 30, 500], ['Dog Training', 60, 900], ['Nail Trim', 15, 150], ['Dog Walk', 30, 200]],
  },
};

// Extra business names are built as "<prefix> <suffix>" once the hand-written ones run out.
const NAME_PREFIXES = ['Prime', 'City', 'Royal', 'Elite', 'Metro', 'Golden', 'Happy', 'Smart', 'Classic', 'Green'];
const NAME_SUFFIXES = {
  'health-wellness': ['Health Clinic', 'Wellness Centre', 'Care Point'],
  'beauty-salon': ['Beauty Lounge', 'Hair Studio', 'Salon & Spa'],
  'fitness-yoga': ['Fitness Hub', 'Yoga Studio', 'Gym & Training'],
  education: ['Learning Centre', 'Coaching Classes', 'Tutorials'],
  consulting: ['Business Consultants', 'Growth Partners', 'Advisory'],
  'home-services': ['Home Services', 'Repair Works', 'Cleaning Co'],
  'legal-finance': ['Legal Associates', 'Tax & Accounts', 'Finance Advisors'],
  'pet-care': ['Pet Care', 'Pet Clinic', 'Paws & Claws'],
};

const REVIEW_COMMENTS = {
  5: ['Excellent service, highly recommended.', 'Very professional and on time.', 'Loved it, will book again.', 'Great experience from start to finish.'],
  4: ['Good service, worth the price.', 'Friendly and helpful.', 'Happy with the result.', ''],
  3: ['Decent, but there is room to improve.', 'It was okay.', ''],
  2: ['Started late and felt rushed.', 'Not what I expected.'],
  1: ['Disappointing experience.'],
};

// People who like the first category often like the second one too.
const RELATED_CATEGORY = {
  'health-wellness': 'fitness-yoga',
  'fitness-yoga': 'health-wellness',
  'beauty-salon': 'fitness-yoga',
  education: 'consulting',
  consulting: 'legal-finance',
  'legal-finance': 'consulting',
  'home-services': 'pet-care',
  'pet-care': 'home-services',
};

const THEMES = [
  { id: 'emerald', accent: '#047857' },
  { id: 'indigo', accent: '#1e104f' },
  { id: 'rose', accent: '#e11d48' },
  { id: 'amber', accent: '#d97706' },
  { id: 'slate', accent: '#0f172a' },
];

const FIRST_NAMES = ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Rohan', 'Meera', 'Arjun', 'Isha', 'Vivaan', 'Sara', 'Aditya', 'Nisha', 'Karan', 'Pooja', 'Rahul', 'Sneha', 'Yash', 'Tanvi', 'Dev', 'Riya'];
const LAST_NAMES = ['Sharma', 'Patil', 'Iyer', 'Khan', 'Desai', 'Reddy', 'Mehta', 'Nair', 'Kulkarni', 'Singh', 'Joshi', 'Das', 'Gupta', 'Fernandes', 'Chopra'];

// Seeded random generator: the same sample data every run.
let randomState = 20261010;
const random = () => {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];
const shuffle = (list) => [...list].sort(() => random() - 0.5);

// Earlier businesses in a category are picked more often, like real bestsellers.
const pickSkewed = (list) => list[Math.floor(random() ** 2 * list.length)];

const clearDemoData = async () => {
  const [demoUsers, demoCustomers] = await Promise.all([
    User.find({ isDemo: true }).distinct('_id'),
    Customer.find({ isDemo: true }).distinct('_id'),
  ]);

  await Promise.all([
    Service.deleteMany({ userId: { $in: demoUsers } }),
    Availability.deleteMany({ userId: { $in: demoUsers } }),
    Interaction.deleteMany({ $or: [{ customerId: { $in: demoCustomers } }, { businessId: { $in: demoUsers } }] }),
    Review.deleteMany({ isDemo: true }),
    User.deleteMany({ _id: { $in: demoUsers } }),
    Customer.deleteMany({ _id: { $in: demoCustomers } }),
  ]);

  return { businesses: demoUsers.length, customers: demoCustomers.length };
};

const qualityOf = new Map(); // businessId -> typical star rating

const seedBusinesses = async (passwordHash) => {
  const takenSlugs = new Set(await User.distinct('slug'));
  const businessesByCategory = {};
  let counter = 0;

  for (const [category, entry] of Object.entries(CATALOGUE)) {
    businessesByCategory[category] = [];

    const names = [...entry.businesses];
    while (names.length < BUSINESSES_PER_CATEGORY) {
      const name = `${pick(NAME_PREFIXES)} ${pick(NAME_SUFFIXES[category])}`;
      if (!names.includes(name)) names.push(name);
    }

    // Each business has a hidden quality level that drives its sample reviews.
    for (const businessName of names) {
      counter += 1;
      const theme = pick(THEMES);
      let slug = slugify(businessName);
      while (takenSlugs.has(slug)) slug = `${slug}-demo`;
      takenSlugs.add(slug);

      const user = await User.create({
        name: businessName,
        email: `business${counter}@demo.bookme`,
        password: passwordHash,
        slug,
        businessName,
        businessDescription: entry.description,
        category,
        brandTheme: theme.id,
        brandAccent: theme.accent,
        isDemo: true,
        // Joined at a random point in the last few months.
        createdAt: new Date(Date.now() - random() * 120 * 24 * 60 * 60 * 1000),
      });

      // Three of the five category services, with slightly different prices per business.
      await Service.insertMany(shuffle(entry.services).slice(0, 3).map(([name, duration, price]) => ({
        userId: user._id,
        name,
        duration,
        price: Math.round((price * (0.85 + random() * 0.3)) / 50) * 50,
        icon: `C${1 + Math.floor(random() * 8)}.png`,
      })));

      // Open Monday to Saturday.
      await Availability.insertMany([1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        userId: user._id,
        dayOfWeek,
        slots: [{ startTime: '09:00', endTime: '18:00' }],
      })));

      qualityOf.set(String(user._id), 3.2 + random() * 1.7);
      businessesByCategory[category].push(user._id);
    }
  }

  return businessesByCategory;
};

const seedCustomersAndHistory = async (passwordHash, businessesByCategory) => {
  const categories = Object.keys(businessesByCategory);
  const customers = [];
  const preferencesByEmail = new Map();

  for (let index = 1; index <= CUSTOMER_COUNT; index += 1) {
    const main = pick(categories);
    const second = random() < 0.6 ? RELATED_CATEGORY[main] : pick(categories);
    const preferred = [...new Set([main, second])];
    const email = `customer${index}@demo.bookme`;

    preferencesByEmail.set(email, preferred);
    customers.push({
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email,
      password: passwordHash,
      // Not everyone fills in their interests at signup.
      interests: random() < 0.6 ? preferred : [],
      emailVerified: true,
      isDemo: true,
    });
  }

  const savedCustomers = await Customer.insertMany(customers);
  const interactions = [];

  savedCustomers.forEach((customer) => {
    const preferred = preferencesByEmail.get(customer.email);
    const eventCount = 8 + Math.floor(random() * 13);

    for (let event = 0; event < eventCount; event += 1) {
      const category = random() < ON_PREFERENCE_SHARE ? pick(preferred) : pick(categories);
      const createdAt = new Date(Date.now() - random() * HISTORY_DAYS * 24 * 60 * 60 * 1000);

      interactions.push({
        customerId: customer._id,
        businessId: pickSkewed(businessesByCategory[category]),
        type: random() < BOOKING_SHARE ? 'book' : 'view',
        createdAt,
        updatedAt: createdAt,
      });
    }
  });

  await Interaction.insertMany(interactions);

  // Some bookings leave a review, scattered around the business's quality level.
  const nameOf = new Map(savedCustomers.map((customer) => [String(customer._id), customer.name]));
  const reviews = interactions
    .filter((interaction) => interaction.type === 'book' && random() < REVIEW_SHARE)
    .map((interaction) => {
      const quality = qualityOf.get(String(interaction.businessId));
      const rating = Math.min(5, Math.max(1, Math.round(quality + (random() - 0.5) * 2)));
      return {
        businessId: interaction.businessId,
        customerId: interaction.customerId,
        customerName: nameOf.get(String(interaction.customerId)),
        rating,
        comment: pick(REVIEW_COMMENTS[rating]),
        isDemo: true,
        createdAt: interaction.createdAt,
        updatedAt: interaction.createdAt,
      };
    });
  await Review.insertMany(reviews);

  return { customers: savedCustomers.length, interactions: interactions.length, reviews: reviews.length };
};

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookme');

const removed = await clearDemoData();

if (process.argv.includes('--clear')) {
  console.log(`Removed ${removed.businesses} sample businesses and ${removed.customers} sample customers`);
} else {
  if (!process.env.SEED_PASSWORD) {
    console.error('SEED_PASSWORD is missing. Add it to backend/.env (it becomes the password of every sample account).');
    process.exit(1);
  }

  // Businesses created before categories existed get the default one.
  await User.updateMany({ category: { $exists: false } }, { category: DEFAULT_CATEGORY });

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
  const businessesByCategory = await seedBusinesses(passwordHash);
  const history = await seedCustomersAndHistory(passwordHash, businessesByCategory);

  console.log(`Created ${Object.values(businessesByCategory).flat().length} sample businesses (business1@demo.bookme ...)`);
  console.log(`Created ${history.customers} sample customers (customer1@demo.bookme ...) with ${history.interactions} interactions and ${history.reviews} reviews`);
  console.log('Every sample account uses the SEED_PASSWORD from backend/.env\n');
}

// Rebuild the stored marketplace listings and ratings for every business, real ones included.
await refreshAllListings();
for (const businessId of await User.distinct('_id')) {
  await refreshRating(businessId);
}

await trainAndReport();
await mongoose.disconnect();
