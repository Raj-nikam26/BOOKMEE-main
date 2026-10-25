# Deploying BookMe

The free setup uses three services:

| Part | Service | Config in this repo |
|---|---|---|
| Database | MongoDB Atlas (free M0 cluster) | none |
| Backend API | Render (free web service) | `render.yaml` |
| Frontend | Vercel (free) | `frontend/vercel.json` |

Deploy in this order: the backend address is needed by the frontend, and the frontend address is needed by the backend.

---

## 1. Database: MongoDB Atlas

1. Create a free account at https://www.mongodb.com/atlas and a free **M0** cluster.
2. **Database Access:** add a database user with a password.
3. **Network Access:** add `0.0.0.0/0`. Render's free plan has no fixed IP address.
4. **Connect → Drivers:** copy the connection string and add the database name before the `?`, for example:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/bookme?retryWrites=true&w=majority
   ```

## 2. Backend: Render

1. Sign in at https://render.com with GitHub.
2. **New → Blueprint**, then pick this repository. Render reads `render.yaml`.
3. Fill in the values it asks for:

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from step 1 |
   | `CLIENT_URL` | `https://example.com` for now; replaced in step 4 |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | a new admin login (not the one from your local `.env`) |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay keys |
   | `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` | Brevo key and verified sender |

   `JWT_SECRET` is generated automatically, and `NODE_ENV=production` and `TZ=Asia/Kolkata` are already set.
4. When the deploy finishes, open `https://YOUR-SERVICE.onrender.com/api/health`. It should show `{"status":"ok"}`.

If the deploy fails, the log says which setting is missing: the server refuses to start in production without its required settings.

## 3. Frontend: Vercel

1. Sign in at https://vercel.com with GitHub, choose **Add New → Project**, and import this repository.
2. Set **Root Directory** to `frontend`. Vercel detects Vite automatically.
3. Under **Environment Variables**, add:
   ```
   VITE_API_URL = https://YOUR-SERVICE.onrender.com/api
   ```
4. Deploy, then note the address, for example `https://bookme.vercel.app`.

## 4. Connect them

In Render, set `CLIENT_URL` to the Vercel address (no trailing slash) and save; Render redeploys. The API now accepts requests only from that address.

## 5. Sample data (optional)

The live database starts empty. To load the sample marketplace and train the recommender, run this from the `backend` folder on your computer, pointing at Atlas:

```bash
MONGO_URI="your Atlas string" SEED_PASSWORD="choose-a-password" npm run seed
```

On Windows PowerShell, set the variables first:

```powershell
$env:MONGO_URI="your Atlas string"; $env:SEED_PASSWORD="choose-a-password"; npm run seed
```

All sample accounts (`business1@demo.bookme`, `customer1@demo.bookme`, ...) use that password. `npm run seed:clear` removes them again.

---

## Checklist and gotchas

- **Brevo:** turn off the authorised-IP restriction (Brevo → Security → Authorised IPs), because Render's IP address changes.
- **Razorpay:** test keys (`rzp_test_`) take no real money. Switch to live keys only after Razorpay activates your account.
- **Render free plan:** the API sleeps after 15 minutes without traffic, and the first request then takes up to a minute. Open the site shortly before a demo.
- **Retraining:** the recommender does not retrain by itself. Run `npm run train` against the live database to update it, or add a Render cron job running `npm run train`.
- **Custom domain:** if you add one in Vercel, update `CLIENT_URL` in Render to match.
