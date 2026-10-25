const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

// Razorpay's checkout is loaded only when a customer actually pays.
const loadScript = () => {
  if (window.Razorpay) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null; // allow a retry
        reject(new Error("Could not load the payment window"));
      };
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
};

/**
 * Opens the Razorpay payment window for an order the server created.
 *
 * Resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * when the customer pays, or with null if they close the window. The result
 * still has to be verified by the server before the booking counts as paid.
 */
export const openRazorpayCheckout = async (order, { accent } = {}) => {
  await loadScript();

  return new Promise((resolve) => {
    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: accent || "#6741f5" },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => resolve(null) },
    });

    checkout.open();
  });
};
