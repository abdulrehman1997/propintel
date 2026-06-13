# PropIntel

**Professional Real Estate Investment Analyzer** — residential **and** commercial underwriting in real time, grounded in how institutional investors actually evaluate deals. Built for ISEM 564.

PropIntel computes pro-grade financial metrics (cap rate, NOI, DSCR, levered/unlevered IRR, equity multiple, composite deal score with red-flag gates), supports side-by-side comparison of 2–4 properties, and renders real charts. It is backed by a local Postgres database fed by a scheduled updater that pulls **free public data sources** (US Census ACS, HUD FMR, FRED, BLS, Zillow research CSVs).

> **Local demo only.** No auth, no hosting, no cloud AI runtime. Everything runs on your machine with Docker + Node. **No API keys are required at runtime** — seeded data is always present, and live data sources fail gracefully when keys are absent.

---

## Tech Stack

| Layer        | Tech                                          |
| ------------ | --------------------------------------------- |
| Framework    | Next.js 16, React 19                          |
| Styling      | Tailwind CSS, framer-motion, lucide-react     |
| Charts       | Recharts                                      |
| Validation   | Zod                                           |
| Database     | PostgreSQL 16 (via Docker)                    |
| Data updater | Node service (`pg`, `csv-parse`, `node-cron`) |
| Tests        | Vitest + Testing Library                      |

---

## Prerequisites

Install these before you start:

| Tool               | Version             | Notes                                                           |
| ------------------ | ------------------- | --------------------------------------------------------------- |
| **Node.js**        | **20 LTS or newer** | Next.js 16 requires Node ≥ 18.18; use 20+ to be safe. `node -v` |
| **npm**            | 9+                  | Ships with Node.                                                |
| **Docker Desktop** | latest              | Runs the Postgres database. Must be **running**.                |
| **Git**            | any                 | To clone the repo.                                              |

Check your versions:

```bash
node -v      # should print v20.x or higher
docker -v    # should print Docker version ...
```

---

## Quick Start (5 steps)

```bash
# 1. Clone the repo and enter it
git clone https://github.com/abdulrehman1997/propintel.git
cd propintel

# 2. Install app dependencies
npm install

# 3. Create your environment file (see "Environment Variables" below)
cp .env.example .env
#    -> open .env and set POSTGRES_PASSWORD (any value, e.g. "propintel")

# 4. Start the database, then seed it with real data
docker compose up -d db          # Postgres comes up on 127.0.0.1:5433
cd updater && npm install && npm run seed && cd ..

# 5. Run the app
npm run dev
```

Open **http://localhost:3000** in your browser. 🎉

---

## Environment Variables

Copy `.env.example` to `.env` and fill it in. The only value you **must** set is `POSTGRES_PASSWORD` (Docker refuses to start the DB without it).

```env
# --- Required ---
POSTGRES_PASSWORD=propintel

# --- Database connection (defaults match docker-compose; keep as-is) ---
# Host port is 5433 to avoid clashing with any local Postgres on 5432.
DATABASE_URL=postgres://propintel:propintel@localhost:5433/propintel
```

### Optional: live data refresh API keys

All of these are **optional**. Without them, the app runs on the seeded snapshot and each live source simply skips itself. Add any you have to enable richer/fresher data via the updater:

| Variable                         | Source                     | Free key from                                       |
| -------------------------------- | -------------------------- | --------------------------------------------------- |
| `CENSUS_API_KEY`                 | US Census ACS              | https://api.census.gov/data/key_signup.html         |
| `HUD_API_TOKEN`                  | HUD Fair Market Rents      | https://www.huduser.gov/portal/dataset/fmr-api.html |
| `FRED_API_KEY`                   | FRED economic data         | https://fred.stlouisfed.org/docs/api/api_key.html   |
| `BLS_API_KEY`                    | Bureau of Labor Stats      | https://www.bls.gov/developers/                     |
| `RAPIDAPI_KEY` + `RAPIDAPI_HOST` | Zillow listings (RapidAPI) | https://rapidapi.com/                               |

> The `updater/.env.example` file lists additional optional tuning knobs (`SEED_ZIPS`, `LISTINGS_STATE`, `ZILLOW_LOCATIONS`, `CRON_SCHEDULE`, etc.) for controlling what the updater pulls. Defaults are sensible — you can ignore these for a demo.

---

## The Database

PostgreSQL runs in Docker via `docker-compose.yml`.

```bash
docker compose up -d db     # start (detached)
docker compose ps           # check health — wait for "healthy"
docker compose logs -f db   # tail logs
docker compose down         # stop (data persists in a named volume)
docker compose down -v      # stop AND wipe all data
```

- Exposed on **`127.0.0.1:5433`** (localhost only).
- Data persists in the `propintel_pgdata` Docker volume across restarts.

### Seeding data

The updater creates the schema and loads real benchmark data. Run it once after the DB is healthy:

```bash
cd updater
npm install
npm run seed     # one-shot: create schema + upsert data
cd ..
```

- `npm run seed` is **idempotent** — safe to run again anytime.
- `npm run start` (inside `updater/`) runs the same load on a `node-cron` schedule for continuous refresh (optional).

---

## Running the App

```bash
npm run dev      # development server with hot reload  -> http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

---

## Testing

```bash
npm test             # run all unit/integration tests once (Vitest)
npm run test:watch   # watch mode
npm run test:cov     # with coverage report (target: 80%+ on lib/)
npm run test:api     # only the /api/neighborhood tests
```

The updater has its own suite:

```bash
cd updater && npm test
```

---

## Project Structure

```
.
├── app/                 # Next.js app router
│   ├── api/             # API routes: geocode, listings, neighborhood
│   └── ...              # pages & UI
├── lib/                 # Pure analysis engine (finance, residential,
│                        #   commercial, scoring, constants) — unit-tested
├── updater/             # Data platform: pulls public APIs -> Postgres
│   ├── seed.js          # one-shot schema + data load
│   ├── index.js         # cron-scheduled refresh service
│   └── repositories.js  # DB access
├── docs/                # Underwriting methodology specs (residential + CRE)
├── public/              # Static assets
├── docker-compose.yml   # Postgres service
└── .env.example         # Environment template
```

---

## Troubleshooting

| Problem                                                      | Fix                                                                                                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` fails: _"POSTGRES_PASSWORD must be set"_ | You skipped `.env`. Set `POSTGRES_PASSWORD` in `.env`.                                                                        |
| App can't connect to DB / neighborhood data is empty         | DB not seeded. Run `cd updater && npm run seed`. Confirm `docker compose ps` shows **healthy**.                               |
| Port `5433` already in use                                   | Another Postgres is using it. Change the host port in `docker-compose.yml` and update `DATABASE_URL` (and `PGPORT`) to match. |
| Port `3000` already in use                                   | Stop the other process, or run `npm run dev -- -p 3001`.                                                                      |
| `npm install` errors on Node version                         | Upgrade to Node 20 LTS+ (`node -v`).                                                                                          |
| Charts/pages look broken after pulling                       | Delete `.next/` and re-run `npm run dev`.                                                                                     |

---

## Notes for Contributors

- Production code lives on the **`master`** branch.
- Feature work-in-progress lives on **`feat/search-filters-nl`**.
- Coding standards: immutable data patterns, small focused files (< 800 lines), pure engine modules. Methodology source of truth is in `docs/`.
- Run `npm test` before pushing.
