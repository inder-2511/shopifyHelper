# Deployment

Frontend → **Vercel**, backend → **Render**.

Playwright-driven features (Create Store, Store Setup, Shipping, Products import, Activate Payment) run only locally — the hosted backend returns `501` for those routes and the hosted frontend hides their sidebar links.

## Backend (Render)

1. New → **Web Service** → connect this repo.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment variables:

   | Key | Value |
   | --- | --- |
   | `PORT` | `10000` (Render sets this; leave whatever it provides) |
   | `SHOPIFY_API_VERSION` | `2024-10` |
   | `FRONTEND_ORIGIN` | `https://<your-vercel-app>.vercel.app` (add later after Vercel deploy) |
   | `DISABLE_LOCAL_FEATURES` | `true` |

   Do **not** set `USER_EMAIL` / `USER_PASSWORD` — Playwright is disabled here.

6. Deploy. Note the URL (e.g. `https://shopify-helper-api.onrender.com`).

## Frontend (Vercel)

1. New Project → import this repo.
2. Root directory: `frontend`
3. Framework preset: **Vite** (auto-detected).
4. Environment variables:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com` |
   | `VITE_HIDE_LOCAL_FEATURES` | `true` |

5. Deploy. Once live, go back to Render and set `FRONTEND_ORIGIN` to the Vercel URL, then redeploy the backend.

## Local dev

No env vars required. Frontend defaults to `http://localhost:5000`; backend allows all origins and enables all routes when the flags above are unset. Copy `.env.example` in each folder if you want to override defaults.
