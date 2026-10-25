import client from "./client";

export const getPaymentOverview = () => client.get("/payments/overview");

export const updatePayoutDetails = (payload) =>
  client.put("/payments/payout-details", payload);

// Amount is in paise.
export const requestWithdrawal = (amount) =>
  client.post("/payments/withdrawals", { amount });
