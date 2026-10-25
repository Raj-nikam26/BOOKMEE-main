// Service prices are stored in whole rupees.
export const formatPrice = (price) =>
  Number(price) > 0 ? `₹${Number(price).toLocaleString("en-IN")}` : "Free";
