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
- Task 9: compare-store + Nav — DONE
  - Created `app/lib/compare-store.jsx` (JSX extension required — contains CompareContext.Provider)
  - Created `app/lib/compare-store.test.jsx` (2/2 passing)
  - Created `app/components/shell/Nav.jsx`
  - Wired `CompareProvider` + `Nav` into `app/layout.js` (additive only)
  - Key fix: used functional updater form of `setItems` in `add`/`remove` so rapid successive calls (within one `act`) each see the latest state rather than the stale closure value

## Pending Tasks (from plan)

- Task 5: `GET /api/listings` route
- Task 6: `GET /api/listings/[id]` route
- Task 7: `listing-adapter` (pure bridge)
- Tasks 10–12: Frontend (ListingCard, search page, compare page)

## Key Decisions

- `buildListingsQuery` uses a `$?` sentinel replaced with actual param index after push — keeps numbering correct without pre-scanning.
- `getPool()` is called at call-time inside async functions, not at module load, so the pure builder is testable without a DB connection.
- vitest include pattern was widened to `lib/**/__tests__` (was `app/**` only).

## Modified Files (this session, not yet committed)

- `lib/db/listingsRepo.js` (new)
- `lib/db/__tests__/listingsRepo.test.js` (new)
- `vitest.config.js` (include pattern extended)
