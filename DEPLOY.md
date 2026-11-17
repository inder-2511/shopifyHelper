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

## PrestaShop mode

The logo dropdown in the sidebar switches between Shopify and PrestaShop. PrestaShop needs **no extra env vars** — each page sends the store's Shop URL and Webservice key with the request (routes live under `/api/presta/*`).

- The **backend** talks to the store, not the browser, so the store must be reachable from wherever the backend runs. A hosted backend (Render) cannot reach a `localhost` or private-network PrestaShop — run the backend locally for those.
- In the store: Back Office → Advanced Parameters → Webservice → enable the webservice and add a key with the GET/POST/PUT/DELETE permissions your tests need (orders, carts, customers, addresses, products, stock_availables, plus read access to countries, carriers, order_states, currencies, languages, categories, zones, tax_rule_groups for the dropdowns).
