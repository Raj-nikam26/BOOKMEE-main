


import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DEFAULT_CATEGORY, isValidCategory } from '../constants/categories.js';
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import { getEmailConfigStatus } from '../utils/bookingNotifications.js';
import { createEmailOtp, verifyEmailOtp } from '../utils/emailOtp.js';
import { getGoogleAuthUrl, getOAuthClient, isGoogleConfigured } from '../utils/googleCalendar.js';
import { refreshListing } from '../utils/listing.js';
import { getPaymentProvider, isPaymentTestMode } from '../utils/payments.js';
import { slugify } from '../utils/slugify.js';
import { cleanEmail, cleanText, getPasswordProblem, isValidEmail, isValidHexColour } from '../utils/validate.js';

const BRAND_THEMES = ['emerald', 'indigo', 'rose', 'amber', 'slate'];

// Compared against when the email is unknown, so a login attempt takes the same
// time whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', 10);

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const buildUniqueSlug = async (value) => {
  const baseSlug = slugify(value) || 'business';
  let finalSlug = baseSlug;
  let counter = 1;

  while (await User.findOne({ slug: finalSlug })) {
    finalSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return finalSlug;
};

const toUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  slug: user.slug,
  businessName: user.businessName,
  businessDescription: user.businessDescription,
  category: user.category,
  brandTheme: user.brandTheme,
  brandAccent: user.brandAccent,
  timezone: user.timezone,
  googleCalendarConnected: user.googleCalendarConnected,
  googleCalendarId: user.googleCalendarId,
  payoutDetails: user.payoutDetails,
  ratingAverage: user.ratingAverage || 0,
  ratingCount: user.ratingCount || 0,
  // Real status of each integration, so the app never claims something is
  // connected when it is not.
  paymentProvider: getPaymentProvider(), // 'razorpay' | 'stripe' | 'demo' | null
  paymentTestMode: isPaymentTestMode(),
  emailConfigured: getEmailConfigStatus().configured,
  googleCalendarAvailable: isGoogleConfigured(),
});






export const requestRegistrationOtp = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const result = await createEmailOtp({ email, purpose: 'registration' });
    res.json({ message: 'Verification code sent', devCode: result.devCode });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Could not send verification code', error: error.message });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, emailOtp } = req.body;
    if (!email || !emailOtp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpResult = await verifyEmailOtp({ email, purpose: 'registration', code: emailOtp, consume: false });
    if (!otpResult.verified) {
      return res.status(400).json({ message: otpResult.reason || 'Invalid OTP' });
    }

    res.json({ message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { password, emailOtp, category } = req.body;
    const name = cleanText(req.body.name, 80);
    const businessName = cleanText(req.body.businessName, 80);
    const email = cleanEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const passwordProblem = getPasswordProblem(password);
    if (passwordProblem) {
      return res.status(400).json({ message: passwordProblem });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const otpResult = await verifyEmailOtp({ email, purpose: 'registration', code: emailOtp, consume: true });
    if (!otpResult.verified) {
      return res.status(400).json({ message: otpResult.reason || 'Email verification is required' });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      businessName: businessName || name,
      category: isValidCategory(category) ? category : DEFAULT_CATEGORY,
      slug: await buildUniqueSlug(businessName || name),
    });

    // Start every new business with Monday-Friday, 9 to 5.
    await Availability.insertMany([1, 2, 3, 4, 5].map((dayOfWeek) => ({
      userId: user._id,
      dayOfWeek,
      slots: [{ startTime: '09:00', endTime: '17:00' }],
    })));

    res.status(201).json({
      message: 'Account created',
      token: signToken(user),
      user: toUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    const passwordMatches = await bcrypt.compare(String(password), user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Logged in',
      token: signToken(user),
      user: toUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: toUserResponse(user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getGoogleConnectUrl = async (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({
      message: 'Google Calendar is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env',
    });
  }

  const state = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ url: await getGoogleAuthUrl(state) });
};

export const handleGoogleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { code, state } = req.query;
    const { id } = jwt.verify(state, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const { tokens } = await (await getOAuthClient()).getToken(code);

    const updates = { googleCalendarConnected: true };
    if (tokens.refresh_token) updates.googleRefreshToken = tokens.refresh_token;
    await User.findByIdAndUpdate(id, updates);

    res.redirect(`${clientUrl}/profile?calendar=connected`);
  } catch (error) {
    console.error('Google Calendar connection failed:', error.message);
    res.redirect(`${clientUrl}/profile?calendar=failed`);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { businessName, businessDescription, timezone, brandTheme, brandAccent, category } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (brandAccent !== undefined && !isValidHexColour(brandAccent)) {
      return res.status(400).json({ message: 'Accent colour must be a hex colour like #6741F5' });
    }

    if (businessName !== undefined) user.businessName = cleanText(businessName, 80);
    if (businessDescription !== undefined) user.businessDescription = cleanText(businessDescription, 500);
    if (timezone !== undefined) user.timezone = cleanText(timezone, 60);
    if (BRAND_THEMES.includes(brandTheme)) user.brandTheme = brandTheme;
    if (brandAccent !== undefined) user.brandAccent = brandAccent;
    if (isValidCategory(category)) user.category = category;

    const baseSlug = slugify(user.businessName || user.name) || 'business';
    let finalSlug = baseSlug;
    let counter = 1;

    while (await User.findOne({ slug: finalSlug, _id: { $ne: user._id } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    user.slug = finalSlug;

    await user.save();
    await refreshListing(user._id);

    res.json({
      message: 'Profile updated successfully',
      user: toUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};