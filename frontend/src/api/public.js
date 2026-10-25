import client from "./client";

// One page of the marketplace directory.
// sort: recommended | rating | newest | price-low | price-high
export const listPublicBusinesses = ({ search, category, sort, page } = {}) =>
  client.get("/public/directory/businesses", {
    params: {
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(sort ? { sort } : {}),
      ...(page ? { page } : {}),
    },
  });

// Tells the recommender that the logged-in customer opened this business.
export const trackBusinessView = (slug) => client.post(`/public/${slug}/view`);

export const getPublicBusiness = (slug) => client.get(`/public/${slug}`);

export const getPublicSlots = (slug, params) =>
  client.get(`/public/${slug}/slots`, { params });

export const requestPublicBookingOtp = (slug, customerEmail) =>
  client.post(`/public/${slug}/otp`, { customerEmail });

export const verifyPublicBookingOtp = (slug, payload) =>
  client.post(`/public/${slug}/otp/verify`, payload);

export const createPublicBooking = (slug, payload) =>
  client.post(`/public/${slug}/bookings`, payload);

export const getBookingStatus = (params) =>
  client.get("/public/bookings/status", { params });

// Sends the Razorpay checkout result to the server, which confirms the booking
// only after checking the payment with Razorpay.
export const verifyRazorpayPayment = (payload) =>
  client.post("/public/bookings/razorpay/verify", payload);

// `token` is the secret the server returned when the booking was started.
export const cancelBookingPayment = (bookingId, token) =>
  client.post("/public/bookings/cancel", { booking_id: bookingId, token });
