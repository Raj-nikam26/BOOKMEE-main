# BookMe: features added after the base project

Four parts were added on top of the base booking app: the marketplace landing page, Razorpay payments, Brevo email, and the recommendation (ML) system.

---

## 1. Marketplace landing page

**What it does:** the home page (`/`) is a public marketplace. Customers search services, filter by category, sort by price or rating, compare prices, and see personal recommendations. A logged-in business is sent to its dashboard instead.

**Frontend**
| File | Role |
|---|---|
| `frontend/src/pages/LandingPage.jsx` | The page: hero with search, recommendation rows, business directory with filters, "how it works", footer |
| `frontend/src/components/marketplace/HeroPreview.jsx` | Product preview card shown in the hero |
| `frontend/src/components/marketplace/BusinessCard.jsx` | One business card: rating, services, price, price-comparison badge |
| `frontend/src/components/marketplace/Shelf.jsx` | A horizontal scrolling row of cards |
| `frontend/src/components/marketplace/ExploreShelf.jsx` | One row with tabs (Popular / Top rated / New / your categories) |
| `frontend/src/components/marketplace/MarketplaceHeader.jsx` | Top bar: customer login, My bookings, "For business" |
| `frontend/src/pages/CustomerAuthPage.jsx` | Customer sign-up (with email code) and login |
| `frontend/src/pages/MyBookingsPage.jsx` | Customer booking history: cancel, rate, book again |
| `frontend/src/assets/marketplaceStyles.js` | Styles for these pages |
| `frontend/src/constants/categories.js` | The 8 business categories |
| `frontend/src/utils/customerSession.js` | Keeps one account logged in at a time (customer or business) |
| `frontend/src/App.jsx` | Routes: `/` goes to the landing page, or to the dashboard for a business |

**Backend**
| File | Role |
|---|---|
| `backend/utils/businessCards.js` | Directory search: pagination (12 per page), sorting, category filter, price comparison |
| `backend/utils/listing.js` | Keeps a copy of each business's card data on the business, so listings never read the services table |
| `backend/controllers/publicController.js` → `listPublicBusinesses` | `GET /api/public/directory/businesses` |
| `backend/controllers/customerController.js` | Customer sign-up, login, interests |
| `backend/controllers/customerBookingController.js` | My bookings, customer cancel, reviews |
| `backend/models/Customer.js`, `Review.js` | Customer accounts and ratings |

**How the price comparison works:** when a customer searches a service (e.g. "haircut"), the server works out the average and lowest price of all matching services and labels each card: "Lowest price", "x% below average" or "x% above average".

---

## 2. Razorpay payment integration

**What it does:** paid bookings are paid through Razorpay's checkout window on the booking page.

| File | Role |
|---|---|
| `backend/utils/razorpay.js` | Razorpay client and signature check (HMAC-SHA256 of `order_id|payment_id` with the secret key) |
| `backend/utils/payments.js` | Picks the gateway: Razorpay → Stripe → demo mode |
| `backend/controllers/publicController.js` → `createPublicBooking` | Creates the booking as "pending payment" and a Razorpay order for the exact price |
| `backend/controllers/publicController.js` → `verifyRazorpayPayment` | Confirms the booking after payment |
| `backend/routes/publicRoutes.js` | `POST /api/public/bookings/razorpay/verify` |
| `backend/models/Booking.js` | New fields: `paymentProvider`, `razorpayOrderId`, `razorpayPaymentId` |
| `frontend/src/utils/razorpayCheckout.js` | Loads Razorpay's script and opens the payment window |
| `frontend/src/pages/PublicBookingPage.jsx` | Calls the checkout and then the verify endpoint |
| `backend/.env` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys) |

**Flow**
1. The customer picks a slot and clicks **Pay**. The server saves the booking as `pending_payment` and creates a Razorpay order.
2. The browser opens the Razorpay window with that order.
3. After payment, the browser sends the payment id and signature to the server.
4. The server checks the signature, fetches the payment from Razorpay, and checks the amount and order. Only then does it mark the booking paid and confirmed and credit the business wallet (minus the 10% platform fee).

**Edge cases handled**
- Closing the window releases the held slot.
- If someone else got the slot during payment, the money is refunded automatically.
- Forged payment results are rejected.
- The secret key never reaches the browser.

---

## 3. Brevo email integration

**What it does:** sends verification codes (OTP) and booking emails through the Brevo API.

| File | Role |
|---|---|
| `backend/utils/bookingNotifications.js` | Calls Brevo's API (`https://api.brevo.com/v3/smtp/email`) and builds the HTML emails |
| `backend/utils/emailOtp.js` | Creates and checks 6-digit codes |
| `backend/models/EmailOtp.js` | Stored codes (hashed, auto-deleted after expiry) |
| `backend/controllers/authController.js` | Code for business sign-up |
| `backend/controllers/customerController.js` | Code for customer sign-up |
| `backend/controllers/publicController.js` | Code for bookings without an account, and confirmation emails |
| `backend/.env` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (a verified sender in Brevo) |

**Emails sent**
- Verification code: business sign-up, customer sign-up, and booking without an account.
- Booking confirmed, rescheduled or cancelled: sent to both the customer and the business.

**Code rules**
- Codes expire after 10 minutes.
- 5 wrong tries invalidate the code.
- One code per address every 30 seconds.
- Codes are stored as SHA-256 hashes.

If Brevo is not configured during development, the code is shown on screen instead.

---

## 4. Recommendation system (ML part)

**Type:** a hybrid recommender. Its trained part is **item-based collaborative filtering**, combined with category (content) matching and popularity. It is a classic recommender, not deep learning.

| File | Role |
|---|---|
| `backend/models/Interaction.js` | Training data: every view and booking by a logged-in customer |
| `backend/utils/recommender.js` | Training (`buildModel`, `train`) and ranking (`rankCandidates`, `diversify`) |
| `backend/models/BusinessNeighbours.js` | Trained output: the most similar businesses for each business |
| `backend/models/RecommendationModel.js` | When it was last trained, with data counts |
| `backend/controllers/recommendationController.js` | Builds the rows on the home page |
| `backend/scripts/train.js` | `npm run train`: trains and prints the accuracy test |
| `backend/scripts/seed.js` | `npm run seed`: sample data (96 businesses, 600 customers, ~8,500 interactions) |

**Training (`npm run train`)**
1. Each customer–business pair gets a weight: view = 1 (at most 3), booking = 5.
2. **Cosine similarity** is computed between every pair of businesses that share customers ("customers who used A also used B").
3. The top 20 similar businesses are saved for each business, plus a popularity score.

**Ranking (every home page load)**
1. **Candidates:** similar businesses to what the customer used, the most popular in their favourite categories, and the most popular overall.
2. **Score** = 0.5 × collaborative + 0.35 × category interest + 0.15 × popularity, with these adjustments:
   - **Time decay:** activity loses half its weight every 45 days.
   - **Diminishing returns:** category interest grows with the log of activity, so one booking can't dominate.
   - **Confidence:** the collaborative part counts less for customers with little history.
3. **Diversity:** no category may fill more than about a third of a list.
4. Each card shows its reason, e.g. "Because you booked X" or "Because you like Fitness".

**Evaluation:** leave-one-out HitRate@5. One booked business per customer is hidden, and the test checks whether it comes back in that customer's top 5. Result on the sample data: **42% for the model against 21% for a plain most-popular list**. This measures patterns in generated sample data, not real users.
