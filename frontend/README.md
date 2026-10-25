# BookMe frontend

React 19 + Vite + Tailwind CSS 4. See the [main README](../README.md) for setup.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

The API address comes from `VITE_API_URL` (see `.env.example`). It defaults to `http://localhost:5000/api`.

| Folder | Contents |
|---|---|
| `src/pages/` | One file per page |
| `src/components/marketplace/` | Landing page: cards, rows, header, hero preview |
| `src/components/business/` | Dashboard panels: setup checklist, reviews |
| `src/api/` | API calls, one file per area |
| `src/assets/` | Images and Tailwind class maps (`*Styles.js`) |
| `src/utils/` | Login session, Razorpay checkout, formatting |
