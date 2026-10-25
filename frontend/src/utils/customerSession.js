// Who is logged in on this browser.
//
// Only one account is active at a time: either a business ("token") or a
// customer ("customerToken"). Logging in as one logs the other out, so a
// business owner never sees the marketplace as some customer account that
// happened to be logged in earlier, and the other way round.
const BUSINESS_TOKEN_KEY = "token";
const TOKEN_KEY = "customerToken";
const PROFILE_KEY = "customer";

export const isBusinessLoggedIn = () =>
  Boolean(localStorage.getItem(BUSINESS_TOKEN_KEY));

export const clearCustomerSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
};

export const getCustomerSession = () => {
  if (isBusinessLoggedIn() || !localStorage.getItem(TOKEN_KEY)) return null;

  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
  } catch {
    return null;
  }
};

// With a token: a customer just logged in, which ends any business session.
// Without one: only the saved profile is refreshed (e.g. interests changed).
export const saveCustomerSession = (token, customer) => {
  if (token) {
    localStorage.removeItem(BUSINESS_TOKEN_KEY);
    localStorage.setItem(TOKEN_KEY, token);
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
};

// A business just logged in, which ends any customer session.
export const saveBusinessSession = (token) => {
  clearCustomerSession();
  localStorage.setItem(BUSINESS_TOKEN_KEY, token);
};

// Browsers that still hold both from before this rule existed: the business
// session wins. Called once when the app starts.
export const enforceSingleAccount = () => {
  if (isBusinessLoggedIn()) clearCustomerSession();
};
