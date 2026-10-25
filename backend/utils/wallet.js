import WalletTransaction from '../models/WalletTransaction.js';
import Withdrawal from '../models/Withdrawal.js';

const totalsBy = async (Model, userId, key) => {
  const rows = await Model.aggregate([
    { $match: { userId } },
    { $group: { _id: `$${key}`, total: { $sum: '$amount' } } },
  ]);
  return rows.reduce((map, row) => ({ ...map, [row._id]: row.total }), {});
};

/**
 * Wallet balances in paise for one provider.
 */
export const getWalletSummary = async (userId) => {
  const [transactions, withdrawals] = await Promise.all([
    totalsBy(WalletTransaction, userId, 'type'),
    totalsBy(Withdrawal, userId, 'status'),
  ]);

  const earned = transactions.booking_payout || 0;
  const held = transactions.withdrawal_hold || 0;
  const reversed = transactions.withdrawal_reversal || 0;

  return {
    earned,
    balance: earned - held + reversed, // can go negative only if two withdrawals race
    available: Math.max(0, earned - held + reversed),
    pendingWithdrawals: (withdrawals.pending || 0) + (withdrawals.processing || 0),
    paidWithdrawals: withdrawals.paid || 0,
  };
};

/**
 * Credits the provider share of a paid booking. Safe to call more than once.
 */
export const createBookingPayoutTransaction = async ({ booking, description }) => {
  if (!booking.providerPayoutAmount) return null;

  const existing = await WalletTransaction.findOne({ bookingId: booking._id, type: 'booking_payout' });
  if (existing) return existing;

  return WalletTransaction.create({
    userId: booking.userId,
    bookingId: booking._id,
    type: 'booking_payout',
    amount: booking.providerPayoutAmount,
    status: 'available',
    description,
  });
};
