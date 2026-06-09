# PropIntel v2 — Design Spec

**Date:** 2026-06-06
**Course:** ISEM 564
**Status:** Approved (design), pending implementation plan

## 1. Goal

Expand the existing single-property residential analyzer into a professional-grade Real Estate Investment Analyzer covering **both residential and commercial** properties, backed by a **real local data platform** (Postgres in Docker fed by a scheduled updater), with **side-by-side comparison** and **real charting**.

Analysis methodology is grounded in how professional/institutional investors actually underwrite deals. See:

- `docs/underwriting-methodology-spec.md` (residential)
- `docs/cre-underwriting-spec.md` (commercial)

## 2. Constraints & Decisions

- **Deployment:** Local demo only (Docker + `npm run dev`). No public hosting, no auth.
- **Runway:** ~3 days wall-clock, vibe-coded (full ~3-4 week scope).
- **Data source:** Free public APIs only (Census ACS, HUD FMR, BLS, FRED, Zillow research CSVs). No paid APIs, no scraping.
- **No AI at runtime.** AI/research used only during planning.
- **Charts:** Recharts.
- **Commercial depth:** Full (per-unit + per-SF, NNN/gross/MG leases, debt sizing, IRR, stress tests).
- **Build order:** Analysis engine → Data platform → Frontend.

## 3. Existing Baseline (keep)

- `lib/calculations.js` — correct residential engine (Cap, NOI, CoC, mortgage, GRM, 1%, DSCR, break-even, 5-yr projection, composite A–F score).
- `app/api/neighborhood/route.js` — Census + HUD integration, 24h in-memory cache. Currently 500s when API keys missing.
- `app/page.jsx` — animated single-property dashboard (Tailwind + framer-motion + lucide), 3 tabs, copy-to-clipboard.
- Stack: Next 16, React 19, Tailwind, framer-motion, lucide-react, clsx, tailwind-merge.

## 4. Architecture — Three Subsystems

### 4.1 Analysis Engine (`lib/`)

Refactor the monolith into focused modules:

- `lib/finance.js` — shared primitives: amortization, mortgage constant K, IRR (numerical), NPV, DSCR, debt yield, max-loan = `MIN(LTV×value, NOI/minDebtYield, NOI/(minDSCR×K))` returning the **binding constraint label**, equity multiple, terminal value.
- `lib/residential.js` — residential underwriting (existing logic moved + extended: user-driven appreciation, stress tests, IRR, equity multiple).
- `lib/commercial.js` — commercial: per-unit (multifamily 5+) and per-SF (retail/office/industrial); NNN / gross / modified-gross lease handling; OER; going-in & exit cap; loss-to-lease; T-12 / rent-roll inputs; debt sizing; levered/unlevered IRR.
- `lib/scoring.js` — composite weighted score + hard red-flag gates (no single metric decides) + stress-test battery (rent −5/−10%, vacancy +5pts, OpEx +10–20%, rate +100–200bps, exit cap +50–100bps, 2-var sensitivity grid).
- `lib/constants.js` — `THRESHOLDS` config (good/strong bands per metric, expense defaults by class A/B/C and age).

All engine code is **pure functions**, client-side, fully unit-testable. Immutable — return new result objects, never mutate inputs.

### 4.2 Data Platform (`docker/` + `updater/`)

- `docker-compose.yml` — Postgres 16 container, named volume, healthcheck.
- Schema (`updater/schema.sql`):
  - `markets` (zip/city/state, geo, last_refreshed)
  - `rent_benchmarks` (zip, bedroom, fmr, source, period)
  - `economic_indicators` (geo, metric, value, source, period) — income, vacancy, unemployment, home value, FRED/BLS series
  - `refresh_log` (source, started_at, finished_at, status, rows, error)
- `updater/` — standalone Node service (not part of Next build):
  - Pull modules per source: `census.js`, `hud.js`, `fred.js`, `bls.js`, `zillow.js` (Zillow research CSV download + parse).
  - `node-cron` schedule (configurable; default daily) + one-shot `npm run seed` for first load and demo.
  - Idempotent upserts. Writes `refresh_log`. Graceful per-source failure (one source down ≠ whole run fails).
- `app/api/neighborhood/route.js` rewired: **read Postgres first**; live API only on miss; this eliminates the current 500-on-missing-keys failure because seeded data is always present.

### 4.3 Frontend (`app/`)

- **Mode toggle:** Residential ↔ Commercial. Swaps input set and result cards. Shared layout shell.
- **Side-by-side compare:** 2–4 properties; ranked table; winner highlight per metric; reuses engine.
- **Charts (Recharts):** projection line chart (value/equity/cash flow over hold), sensitivity heatmap (cap × rate or vacancy), score-breakdown bar.
- **Persistence:** `localStorage` saved deals (save/load/delete). No auth.
- **Input validation:** `zod` schemas at the form boundary; fail fast with clear messages.
- Keep existing animation/design language; extend, don't rewrite.

## 5. Data Flow

```
updater (cron) → free public APIs → Postgres (Docker)
                                        ↓
                     Next /api/* (read Postgres, live API on miss)
                                        ↓
                          React UI ── calls ──> pure calc engine (lib/)
```

## 6. Stack Additions

`pg`, `recharts`, `node-cron`, `zod`. Dev: `vitest` for engine unit tests.

## 7. Testing

- **Unit (priority):** every engine function in `lib/` — formulas vs known-good worked examples from the research specs (e.g. WSP $17.5M loan-sizing example). Target 80%+ on `lib/`.
- **Integration:** updater upsert against a throwaway Postgres; `/api/neighborhood` read path.
- **Manual/demo:** mode toggle, compare flow, charts render at 320/768/1440.

## 8. Error Handling

- Engine: validate inputs (zod), guard divide-by-zero (existing `variableRatio<1` pattern), return typed result with `warnings[]`.
- Updater: per-source try/catch → `refresh_log`, never crash the scheduler.
- API: Postgres-first means graceful degradation; surface stale-data timestamp to UI.

## 9. Out of Scope (YAGNI)

Auth, multi-user, hosting/deploy, paid data APIs, scraping, AI runtime features, mobile app, payment.

## 10. Decomposition → Specs

Each subsystem gets its own implementation plan, built in order:

1. Analysis Engine (refactor + commercial + scoring + tests)
2. Data Platform (Docker + schema + updater + API rewire)
3. Frontend (toggle + compare + charts + persistence)
