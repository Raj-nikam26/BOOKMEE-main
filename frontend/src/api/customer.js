import client from "./client";

export const requestCustomerOtp = (email) =>
  client.post("/customer/register/otp", { email });

export const registerCustomer = (payload) =>
  client.post("/customer/register", payload);

export const loginCustomer = (payload) =>
  client.post("/customer/login", payload);

export const updateCustomerInterests = (interests) =>
  client.put("/customer/interests", { interests });

export const getRecommendations = () => client.get("/customer/recommendations");

// when: "upcoming" | "past"
export const listMyBookings = ({ when, page } = {}) =>
  client.get("/customer/bookings", { params: { when, page } });

// { upcoming, toReview } counts for the home page.
export const getMyBookingSummary = () =>
  client.get("/customer/bookings/summary");

export const cancelMyBooking = (id) =>
  client.patch(`/customer/bookings/${id}/cancel`);

export const reviewMyBooking = (id, review) =>
  client.post(`/customer/bookings/${id}/review`, review);
