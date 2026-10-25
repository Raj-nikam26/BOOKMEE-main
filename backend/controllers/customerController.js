import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isValidCategory } from '../constants/categories.js';
import Customer from '../models/Customer.js';
import { createEmailOtp, verifyEmailOtp } from '../utils/emailOtp.js';
import { cleanEmail, cleanText, getPasswordProblem, isValidEmail } from '../utils/validate.js';

// Compared against when the email is unknown, so a login attempt takes the same
// time whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', 10);

const signToken = (customer) => jwt.sign(
  { id: customer._id, role: 'customer', email: customer.email, verified: customer.emailVerified === true },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const toCustomerResponse = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  emailVerified: customer.emailVerified === true,
  interests: customer.interests,
});

const cleanInterests = (interests) => (
  Array.isArray(interests) ? [...new Set(interests.filter(isValidCategory))] : []
);

/**
 * Emails a verification code to someone signing up as a customer.
 */
export const requestCustomerOtp = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (await Customer.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const result = await createEmailOtp({ email, purpose: 'customer' });
    res.json({ message: 'Verification code sent', devCode: result.devCode });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Could not send verification code', error: error.message });
  }
};

export const registerCustomer = async (req, res) => {
  try {
    const { password, interests, emailOtp } = req.body;
    const name = cleanText(req.body.name, 80);
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

    if (await Customer.findOne({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // The address must be proven before the account exists. Otherwise anyone
    // could sign up as somebody else and act under that person's email.
    const otpResult = await verifyEmailOtp({ email, purpose: 'customer', code: emailOtp, consume: true });
    if (!otpResult.verified) {
      return res.status(400).json({ message: otpResult.reason || 'Email verification is required' });
    }

    const customer = await Customer.create({
      name,
      email,
      emailVerified: true,
      password: await bcrypt.hash(password, 10),
      interests: cleanInterests(interests),
    });

    res.status(201).json({
      message: 'Account created',
      token: signToken(customer),
      customer: toCustomerResponse(customer),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const customer = await Customer.findOne({ email });
    const passwordMatches = await bcrypt.compare(String(password), customer?.password || DUMMY_PASSWORD_HASH);
    if (!customer || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Logged in',
      token: signToken(customer),
      customer: toCustomerResponse(customer),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCustomerMe = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer.id);
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ customer: toCustomerResponse(customer) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateCustomerInterests = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.customer.id,
      { interests: cleanInterests(req.body.interests) },
      { returnDocument: 'after' }
    );
    if (!customer) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Interests saved', customer: toCustomerResponse(customer) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
