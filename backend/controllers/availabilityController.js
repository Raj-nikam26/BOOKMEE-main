import Availability from '../models/Availability.js';
import { timesOverlap } from '../utils/overlap.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const listAvailability = async (req, res) => {
  try {
    const availability = await Availability.find({ userId: req.user.id }).sort({ dayOfWeek: 1 });
    res.json({ availability });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Replaces the time windows for one day of the week.
 */
export const saveAvailability = async (req, res) => {
  try {
    const dayOfWeek = Number(req.body.dayOfWeek);
    const slots = Array.isArray(req.body.slots) ? req.body.slots : [];

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'Invalid day of week' });
    }

    const cleanSlots = slots
      .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }))
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

    const hasInvalidSlot = cleanSlots.some((slot) => (
      !TIME_PATTERN.test(slot.startTime || '') || !TIME_PATTERN.test(slot.endTime || '') || slot.startTime >= slot.endTime
    ));
    if (hasInvalidSlot) {
      return res.status(400).json({ message: 'Each time window needs a start time before its end time' });
    }

    const hasOverlap = cleanSlots.some((slot, index) => (
      index > 0 && timesOverlap(slot.startTime, slot.endTime, cleanSlots[index - 1].startTime, cleanSlots[index - 1].endTime)
    ));
    if (hasOverlap) {
      return res.status(400).json({ message: 'Time windows cannot overlap' });
    }

    const availability = await Availability.findOneAndUpdate(
      { userId: req.user.id, dayOfWeek },
      { slots: cleanSlots },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Availability saved', availability });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
