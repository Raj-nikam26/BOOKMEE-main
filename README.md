# BookMe

**A booking marketplace for service businesses.** Businesses list their services and opening hours and take paid bookings online. Customers search and compare businesses, book a slot in under a minute, and get recommendations that learn what they like.

Built with the MERN stack (MongoDB, Express, React, Node.js), with Razorpay payments, Brevo email and a trained recommendation model.

---

## Features

**For customers**
- Marketplace home page: search services, filter by category, sort by popularity, rating, price or newest
- Price comparison: searching a service shows the average and lowest price, and labels each business ("Lowest price", "20% below average")
- Personal recommendations: Top picks, Book again, "Because you booked X", popular in your categories
- Booking page with live availability and a 14-day date picker
- Online payment through Razorpay
- My bookings: upcoming and past bookings, cancel, rate and review, book again
- Email verification codes (OTP) for sign-up and guest bookings

**For businesses**
- Dashboard with a setup checklist, booking charts, earnings, integrations and reviews
- Services with price, duration and icon; weekly opening hours
- Bookings list with reschedule and cancel; the customer is emailed automatically
- Wallet: earnings after a 10% platform fee, payout details, withdrawal requests
- Public booking link and a branded booking page (theme and accent colour)

**For the platform admin**
- Users, gross revenue, platform fees and recent paid bookings
- Approve, process or reject withdrawal requests

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Axios, Lucide icons |
| Backend | Node.js, Express 5, Mongoose, JSON Web Tokens, bcrypt |
| Database | MongoDB |
| Payments | Razorpay (Stripe also supported) |
| Email | Brevo transactional email API |
| Calendar | Google Calendar API (optional) |
| Security | Helmet, express-rate-limit, input validation, operator-injection guard |

---

## Project structure

```
BOOKMEE-main/
├── backend/                 Express API
│   ├── controllers/         Request handlers (auth, bookings, payments, public, admin, ...)
│   ├── models/              Mongoose schemas
│   ├── routes/              API routes, mounted under /api
│   ├── middleware/          Auth, rate limits, security
│   ├── utils/               Payments, email, recommender, search, validation
│   ├── scripts/             seed, train, sync
│   └── server.js            Entry point
├── frontend/                React app (Vite)
│   └── src/
│       ├── pages/           One file per page
│       ├── components/      Layout, marketplace and dashboard components
│       ├── api/             API calls
│       └── assets/          Images and style maps
├── docs/
│   ├── FEATURES.md          How the main features work and where their code is
│   └── DEPLOYMENT.md        Step-by-step deployment guide
├── render.yaml              Backend deployment blueprint (Render)
└── start-bookme.bat         Starts backend and frontend on Windows
```

---

## Getting started

**Requirements:** Node.js 20 or newer, and MongoDB (local, or a free MongoDB Atlas cluster).

1. **Install dependencies**
   ```bash
   cd backend && npm install
   ```
   ```bash
   cd frontend && npm install
   ```

2. **Configure the backend.** Copy the example file and fill it in:
   ```bash
   cp backend/.env.example backend/.env
   ```
   For a first local run you only need `MONGO_URI`, `JWT_SECRET` and the admin login. Without Razorpay or Brevo keys the app runs in demo mode: payments are confirmed without a checkout and verification codes are shown on screen.

3. **(Optional) Load sample data.** Creates 96 sample businesses and 600 sample customers with history, then trains the recommender:
   ```bash
   cd backend && npm run seed
   ```

4. **Run** the backend and the frontend in two terminals:
   ```bash
   cd backend && npm run dev
   ```
   ```bash
   cd frontend && npm run dev
   ```
   Open http://localhost:5173 (the API runs on http://localhost:5000). On Windows, double-clicking `start-bookme.bat` does both.

### Useful commands

| Folder | Command | What it does |
|---|---|---|
| backend | `npm run dev` | API with auto-restart |
| backend | `npm start` | API for production |
| backend | `npm run seed` | Recreates the sample data and trains the model |
| backend | `npm run train` | Retrains the recommendation model and prints its accuracy |
| frontend | `npm run dev` | Frontend dev server |
| frontend | `npm run build` | Production build |

---

## Environment variables

**Backend (`backend/.env`):** see `backend/.env.example` for every option.

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `CLIENT_URL` | yes | Frontend address, used for CORS and payment redirects |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | Admin panel login |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for payments | Razorpay API keys |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | for email | Brevo API key and a verified sender |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Google Calendar sync |

**Frontend (`frontend/.env`):** only `VITE_API_URL`, the API address ending in `/api`. It is not needed locally.

---

## Recommendation system

A hybrid recommender, trained offline and served in two stages:

- **Collaborative filtering:** item-based, using cosine similarity between businesses ("customers who used A also used B").
- **Content signal:** the customer's category interests.
- **Popularity signal.**
- **Adjustments:** time decay, diminishing returns, a confidence weight for new customers, and a diversity cap per category.

On the sample data, the model's leave-one-out HitRate@5 is about 42%, against 21% for a most-popular baseline. That figure measures patterns in generated sample data, not real users. Details are in [docs/FEATURES.md](docs/FEATURES.md).

---

## Security

- Passwords hashed with bcrypt; JWT tokens limited to HS256, with separate business, customer and admin roles
- Email ownership verified with hashed, expiring one-time codes
- Rate limits on logins and code requests
- Payments confirmed on the server only after checking the Razorpay signature and reading the payment back from Razorpay
- Booking status and cancel links protected by a per-booking secret token
- Server-side validation of every booking slot, plus a unique database index against double booking
- MongoDB operator-injection guard, input length limits, and no internal error details in responses

---

## Deployment

The backend deploys to Render (`render.yaml` included) and the frontend to Vercel (`frontend/vercel.json` included), with MongoDB Atlas as the database. See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## Team

| Member | GitHub | Area |
|---|---|---|
| Raj Nikam | [@Raj-nikam26](https://github.com/Raj-nikam26) | Core platform, security, recommendation system |
| Shubham Rajurkar | [@ShubhamSR22](https://github.com/ShubhamSR22) | Razorpay payment integration |
| Aditya Patil | [@Aaad1tyaaA](https://github.com/Aaad1tyaaA) | Brevo email and OTP verification |
| Shubh Jasuja | [@ShubhJasuja](https://github.com/ShubhJasuja) | Marketplace landing page and UI design |
| Varad Mhetar | [@VMHETAR](https://github.com/VMHETAR) | Recommendation system |
