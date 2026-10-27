// Shared between business pages. Each page renders its own layout, so this
// lives outside React to survive moving from one page to another.
export const bookingAlertState = {
  since: null, // server time of the last check; the next check asks for changes after it
  unseen: 0, // new bookings not yet looked at on the Bookings page
};

// Business pages listen for this to reload their lists.
export const BOOKINGS_CHANGED_EVENT = "bookme:bookings-changed";
