import Service from '../models/Service.js';
import { refreshListing } from '../utils/listing.js';
import { cleanText } from '../utils/validate.js';

const ICON_PATTERN = /^C[1-8]\.png$/;
const MAX_PRICE = 1000000; // rupees
const MAX_SERVICES = 50;

// Returns clean values for whichever service fields were sent, or an error message.
const readServiceFields = (body) => {
  const fields = {};

  if (body.name !== undefined) {
    fields.name = cleanText(body.name, 80);
    if (!fields.name) return { error: 'Service name is required' };
  }
  if (body.duration !== undefined) {
    fields.duration = Math.round(Number(body.duration));
    if (!(fields.duration >= 5 && fields.duration <= 480)) return { error: 'Duration must be between 5 and 480 minutes' };
  }
  if (body.price !== undefined) {
    fields.price = Math.round(Number(body.price));
    if (!(fields.price >= 0 && fields.price <= MAX_PRICE)) return { error: 'Price must be between 0 and 10,00,000' };
  }
  if (body.description !== undefined) fields.description = cleanText(body.description, 500);
  if (body.icon !== undefined && ICON_PATTERN.test(body.icon)) fields.icon = body.icon;
  if (body.isActive !== undefined) fields.isActive = body.isActive === true;

  return { fields };
};

export const listServices = async (req, res) => {
  try {
    const services = await Service.find({ userId: req.user.id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    if (!req.body.name || !req.body.duration) {
      return res.status(400).json({ message: 'Service name and duration are required' });
    }

    const { fields, error } = readServiceFields(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const existing = await Service.countDocuments({ userId: req.user.id, isDeleted: { $ne: true } });
    if (existing >= MAX_SERVICES) {
      return res.status(400).json({ message: `You can have at most ${MAX_SERVICES} services` });
    }

    const service = await Service.create({ userId: req.user.id, ...fields });

    await refreshListing(req.user.id);
    res.status(201).json({ message: 'Service created', service });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Services are soft-deleted so existing bookings keep their service details.
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isDeleted: { $ne: true } },
      { isDeleted: true, isActive: false },
      { returnDocument: 'after' }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await refreshListing(req.user.id);
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { fields: updates, error } = readServiceFields(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, isDeleted: { $ne: true } },
      updates,
      { returnDocument: 'after' }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await refreshListing(req.user.id);
    res.json({ message: 'Service updated', service });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};