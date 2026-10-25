import client from "./client";

export const adminLogin = (payload) => client.post("/admin/login", payload);

export const getAdminDashboard = () => client.get("/admin/dashboard");

export const updateWithdrawalStatus = (id, payload) =>
  client.patch(`/admin/withdrawals/${id}`, payload);
