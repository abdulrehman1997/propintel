# PropIntel v2 — Project Preferences & Decisions

Stack and scope decisions locked during the project interview (2026-06-06).

DECISION: Scope — expand existing residential analyzer to cover both residential AND commercial properties.
DECISION: Methodology — analysis engine grounded in professional/institutional underwriting; source of truth = docs/underwriting-methodology-spec.md + docs/cre-underwriting-spec.md.
DECISION: Commercial depth — FULL (per-unit + per-SF, NNN/gross/MG leases, debt sizing, IRR, equity multiple, stress tests).
DECISION: Data source — free public APIs only (Census ACS, HUD FMR, FRED, BLS, Zillow research CSVs). No paid APIs. No scraping.
DECISION: Data storage — Postgres in Docker (docker-compose), seeded + refreshed by a standalone updater service (node-cron). Next.js reads Postgres-first.
DECISION: AI — no AI/LLM at runtime. AI used only for planning/research.
DECISION: Deployment — local demo only (Docker + npm run dev). No public hosting.
DECISION: Auth — none.
DECISION: Charts — Recharts.
DECISION: Validation — zod at form boundaries.
DECISION: Persistence — localStorage saved deals; no database for user data.
DECISION: Engine style — pure functions, immutable, many small files (<800 lines), unit-tested with vitest, 80%+ coverage on lib/.
DECISION: Build order — (1) analysis engine, (2) data platform, (3) frontend.
DECISION: Runway — ~3 days wall-clock, vibe-coded; treat as full ~3-4 week scope.
DECISION: Keep existing design language (Tailwind + framer-motion + lucide); extend, do not rewrite UI.
DECISION: Stack additions — pg, recharts, node-cron, zod, vitest.
