# PropIntel Project State

## Current Branch

`feat/propintel-v2`

## Phase in Progress

Phase 4 — Frontend

## Completed Tasks (this session)

- Task 4: `listingsRepo` — DONE
  - Created `lib/db/listingsRepo.js` (pure `buildListingsQuery` + `findListings` + `getListingById`)
  - Created `lib/db/__tests__/listingsRepo.test.js` (2/2 passing)
  - Extended `vitest.config.js` include to cover `lib/**/__tests__/**/*.test.{js,jsx}`
- Task 8: `PropertyView` — DONE
  - Created `app/components/property/PropertyView.jsx` (extracted from `app/page.jsx`)
  - Created `app/components/property/PropertyView.test.jsx` (2/2 passing)
  - Inputs collapsed by default behind "Customize" toggle; `ResultsTabs` always visible
- Task 5: `GET /api/listings` route — DONE
  - Created `app/api/listings/route.js` (reads filters from query params, degrades to `{listings:[],source:"unavailable"}` on DB error)
  - Created `app/api/listings/__tests__/route.test.js` (2/2 passing, mocks listingsRepo)
- Task 10: ListingCard + search page — DONE
  - Created `app/components/listings/ListingCard.jsx` (Link + formatCurrency, onCompare callback)
  - Created `app/components/listings/ListingCard.test.jsx` (2/2 passing — TDD RED→GREEN)
  - Created `app/lib/useListings.js` (fetch hook with cancellation via active flag)
  - Created `app/components/listings/SearchFilters.jsx` (q/minPrice/maxPrice/beds inputs with aria-labels)
  - Created `app/search/page.jsx` (maps q → zip or city, renders card grid, degrades to empty state)
- Task 9: compare-store + Nav — DONE
  - Created `app/lib/compare-store.jsx` (JSX extension required — contains CompareContext.Provider)
  - Created `app/lib/compare-store.test.jsx` (2/2 passing)
  - Created `app/components/shell/Nav.jsx`
  - Wired `CompareProvider` + `Nav` into `app/layout.js` (additive only)
  - Key fix: used functional updater form of `setItems` in `add`/`remove` so rapid successive calls (within one `act`) each see the latest state rather than the stale closure value

- Task 3: Listings CSV importer — DONE
  - Created `updater/listings.js` (`upsertListings` + `importListings`; batch 500, cap LISTINGS_MAX=40000)
  - Created `updater/__tests__/listings-import.test.js` (Docker-gated via `describe.skipIf(!DATABASE_URL)`; skips cleanly without DB)
  - Modified `updater/seed.js` to call `importListings()` after `runAllSources`, error-isolated (non-fatal catch)

- Task 6: `GET /api/listings/[id]` route — DONE
  - Created `app/api/listings/[id]/route.js` (`await context.params` for Next.js 16; 404 on not-found and on error)
  - Created `app/api/listings/[id]/__tests__/route.test.js` (3/3 passing; mocks `../../../../../lib/db/listingsRepo.js`)

- Task 1: `listings` table schema — DONE
  - Appended `CREATE TABLE IF NOT EXISTS listings (...)` + 4 indexes to `updater/schema.sql`
  - Created `updater/__tests__/listings-schema.test.js` (2/2 passing)
  - Added `updater/__tests__/**` glob to vitest include + `@vitest-environment node` docblock
  - Did NOT touch `updater/db.js` — `runSchema()` already reads the single `schema.sql` file

- Task 11: `/property/[id]` page — DONE
  - Created `app/property/[id]/PropertyClient.jsx` ("use client"; header with address + price via formatCurrency; PropertyView pre-filled via listingToResidentialInputs)
  - Created `app/property/[id]/PropertyClient.test.jsx` (1/1 passing; mocks framer-motion; asserts address, "Deal Analysis" tab, "$285,000")
  - Created `app/property/[id]/page.jsx` (async server component; awaits params; degrades to not-found message if listing null; passes fmr from neighborhood?.fmr)

- Task 12: CompareMatrix + /compare page — DONE
  - Created `app/components/compare/CompareMatrix.jsx` (metric-rows table; best-cell highlighted with `bg-emerald-50 best` via cn)
  - Created `app/components/compare/CompareMatrix.test.jsx` (2/2 passing — columns render, metric row exists, best cash-flow cell has emerald/best class)
  - Created `app/compare/page.jsx` (client page: reads useCompare items, fetches FMR per ZIP via /api/neighborhood, runs listingToResidentialInputs + analyzeResidentialDeal, feeds CompareMatrix)

- Task 13: Saved Properties — DONE
  - Created `app/lib/saved-listings.js` (useSavedListings hook: save/remove/isSaved, key `propintel.savedListings.v1`, functional setState updaters to avoid stale-closure dedupe bugs, hydrates from localStorage on mount)
  - Created `app/lib/saved-listings.test.js` (9/9 passing: empty start, save, dedupe by id, dedupe with multiple existing, remove, remove no-op, isSaved, localStorage persist, hydration)
  - Created `app/saved/page.jsx` (client page: empty state + grid of ListingCard with Remove overlay buttons)
  - Modified `app/property/[id]/PropertyClient.jsx`: added useSavedListings import + toggle "♥ Save" / "♥ Saved" button in header (additive only; existing test 1/1 still passes)

## Pending Tasks (from plan)

- Task 7: `listing-adapter` (pure bridge)

## Key Decisions

- `buildListingsQuery` uses a `$?` sentinel replaced with actual param index after push — keeps numbering correct without pre-scanning.
- `getPool()` is called at call-time inside async functions, not at module load, so the pure builder is testable without a DB connection.
- vitest include pattern was widened to `lib/**/__tests__` and `updater/__tests__` (was `app/**` only).
- `updater/__tests__` tests run under `@vitest-environment node` (jsdom does not provide file-scheme `import.meta.url`).

## Modified Files (this session, not yet committed)

- `lib/db/listingsRepo.js` (new)
- `lib/db/__tests__/listingsRepo.test.js` (new)
- `vitest.config.js` (include pattern extended, environmentMatchGlobs added)
- `app/api/listings/route.js` (new)
- `app/api/listings/__tests__/route.test.js` (new)
- `app/api/listings/[id]/route.js` (new)
- `app/api/listings/[id]/__tests__/route.test.js` (new)
- `updater/schema.sql` (listings DDL appended)
- `updater/__tests__/listings-schema.test.js` (new)
