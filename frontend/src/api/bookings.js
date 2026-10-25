import client from "./client";

export const listBookings = (params = {}) =>
  client.get("/bookings", { params });

// Reviews customers left for the logged-in business.
export const listMyReviews = (page = 1) =>
  client.get("/bookings/reviews", { params: { page } });

export const updateBookingStatus = (id, status) =>
  client.patch(`/bookings/${id}`, { status });

export const rescheduleBooking = (id, payload) =>
  client.patch(`/bookings/${id}/reschedule`, payload);
