# PropIntel — Property-Search & Analysis Portal (Design)

**Date:** 2026-06-07
**Branch context:** `feat/propintel-v2`
**Status:** Approved design, pending spec review → implementation plan

## 1. Goal

Turn PropIntel from a manual deal calculator into a **property-search and
investment-analysis portal** backed by a database of **real US residential
listings**. The user searches real properties, opens one to see the full
(existing) tabbed analysis pre-filled for that property, and selects 2–4
properties to compare side by side.

This reuses the existing analysis engine, neighborhood data pipeline, and the
already-built tabbed results UI. The net-new work is the listings data, the
search/compare pages, and the bridge that turns a listing into engine inputs.

## 2. Why / context

The seeded Postgres currently holds **aggregate market data** (Census ACS, HUD
FMR, Zillow research indices) keyed by ZIP — not individual properties. That is
why no listings appear today. There is **no free, legal, real-time, nationwide
US listings API** (Zillow's public API was retired in 2021; scraping violates
ToS and is fragile). The chosen, sanctioned-and-free path is to **seed a real
public listings dataset** (Kaggle "USA Real Estate Dataset", a Realtor.com
snapshot) into Postgres. Data is a real snapshot, not live.

## 3. Data

### 3.1 Source

Kaggle "USA Real Estate Dataset" (Realtor.com export). Relevant columns:
`price, bed, bath, house_size, acre_lot, street, city, state, zip_code, status,
prev_sold_date, brokered_by`.

### 3.2 Scope

Focused subset: states/metros that overlap the ZIPs we already have HUD/Census
data for (Pennsylvania + a few additional metros), roughly **10k–50k rows**.
Keeps Postgres light and search fast, and ensures most listings have matching
neighborhood/FMR rows.

### 3.3 New table `listings`

```
listings(
  id            serial primary key,
  source        text,         -- 'KAGGLE_REALTOR'
  status        text,         -- 'for_sale' | 'sold' (filter to for_sale)
  street        text,
  city          text,
  state         text,         -- 2-letter
  zip           text,         -- 5-digit, FK-ish join to markets.zip
  price         numeric,
  beds          integer,
  baths         numeric,
  sqft          integer,      -- from house_size
  lot_acres     numeric,      -- from acre_lot
  property_type text,         -- defaulted 'single_family' (dataset has no type)
  list_date     date,         -- prev_sold_date when present, else null
  imported_at   timestamptz default now()
)
```

Indexes: `(zip)`, `(state, city)`, `(price)`, `(beds)`.

### 3.4 Importer

New `updater/listings.js`, same pattern as the existing source modules:
CSV stream → normalize (5-digit zip, integer beds, numeric price) → idempotent
upsert keyed by a deterministic natural key (`source + street + zip + price`).
Filter to `status = 'for_sale'` and to the in-scope states. Skip rows missing
price/zip/beds. Logs to the existing `refresh_log`. Wired into `npm run seed`.

### 3.5 Known gaps

- No property tax in the dataset → tax is an **estimated assumption** (% of
  price), like the other non-listing inputs.
- No photos → card/detail use a styled placeholder (no external image fetch).
- No property type → default to single-family.

## 4. Pages (Next.js App Router)

### 4.1 `/search` (landing)

- Search box: city / ZIP / free-text address.
- Filters: price range, beds (min), property status.
- Results: responsive grid of **listing cards** — placeholder image, address,
  price, beds/baths/sqft, a quick **estimated cap rate** (cheap server- or
  client-computed headline), **＋ Compare** toggle, **View** link.
- Pagination or "load more" (bounded page size, e.g. 24).

### 4.2 `/property/[id]`

**This is the existing tabbed analysis page, pre-filled for the listing.**

- Reuses the current layout: input panel + `ResultsTabs`
  (**Deal Analysis · Charts · Stress Tests · BRRRR · Neighborhood ·
  Projections**) — all unchanged.
- Pre-filled via the listing-adapter (§5): price/beds/sqft from the listing,
  rent from HUD FMR by ZIP+beds, taxes/insurance/%/financing from defaults.
- **Input panel collapsed by default** behind a **"Customize" toggle**; the user
  lands directly on the analysis for that property. Expanding reveals the
  editable inputs; edits recompute live (frontend-only, engine in browser).
- Header actions: **＋ Add to Compare**, **♥ Save**.
- The Neighborhood tab uses the existing neighborhood API for that ZIP.

### 4.3 `/compare`

- Metric-rows table: properties = columns (2–4), metrics = rows
  (price, beds/baths/sqft, est. rent, grade, cash flow, CoC/Cap/IRR, DSCR,
  neighborhood score).
- **Best cell per row highlighted.** Remove-per-column. "Save all".
- Each column's metrics come from running each listing through the engine
  (same adapter as the property page), using default (non-customized)
  assumptions for an apples-to-apples comparison.

### 4.4 `/saved`

- Properties the user saved (localStorage), each linking back to its
  `/property/[id]` page. Reuses/extends the existing saved-deals logic.

### 4.5 Navigation

Persistent top nav: `PropIntel | Search · Saved · Compare (n)`. The compare
count reflects the current selection.

## 5. The bridge: listing → analysis

New `app/lib/listing-adapter.js`:

- Input: a `listings` row + that ZIP's HUD FMR (via existing
  `lib/db/neighborhoodRepo`).
- Output: the residential engine input object consumed by the **existing**
  `analyzeResidentialDeal` (`app/lib/engine-adapter.js`) — unchanged engine.
- Mapping:
  - `purchasePrice` ← listing.price
  - `monthlyRent` ← FMR for listing.beds (3BR→twoBed/threeBed fallback chain),
    else a price-based fallback
  - `bedrooms`, `sqft` ← listing
  - `annualPropertyTax` ← estimate (% of price) since the dataset lacks it
  - financing + vacancy/mgmt/maint/capEx/insurance ← existing defaults
- Pure function, fully unit-testable. No engine or scoring changes.

## 6. State / data flow

- **Listings: read-only** from Postgres via new API routes:
  - `GET /api/listings?city=&zip=&state=&minPrice=&maxPrice=&beds=&page=`
  - `GET /api/listings/[id]`
    Both degrade gracefully (empty list / 404 shape) when the DB is unseeded,
    consistent with the neighborhood route's degradation pattern.
- **Compare selection + saved properties: localStorage** (extend the existing
  `useSavedDeals` / compare-ranking logic). Selection persists across pages via
  a small React context or URL params.
- **All analysis runs client-side** in the existing engine. No server compute.
- Listing facts are never mutated; the DB only serves them.

## 7. Reuse vs. new

**Reuse (unchanged):** `lib/finance|residential|commercial|scoring|brrrr`,
`engine-adapter`, `ResultsTabs` + all tab components, charts, neighborhood
panel + API, scoring, `compare-ranking`, Postgres infra, `neighborhoodRepo`,
the jsdom test setup.

**New:**

- `listings` table + `updater/listings.js` importer
- `GET /api/listings`, `GET /api/listings/[id]`
- `app/lib/listing-adapter.js`
- Pages: `/search`, `/property/[id]`, `/compare`, `/saved`
- Components: `ListingCard`, `SearchFilters`, `CompareMatrix`, `PropertyView`
  (wraps the current input-panel + `ResultsTabs`, with the Customize toggle),
  top `Nav`
- Compare-selection store (context or URL-param hook)

**Changed:** the current single-page `app/page.jsx` becomes/redirects to
`/search`; its input-panel + results composition is extracted into
`PropertyView` so `/property/[id]` can reuse it pre-filled.

## 8. Testing

- **Unit:** `listing-adapter` (listing + FMR → engine input, fallbacks),
  listings query/filter builder, compare ranking over properties.
- **Integration (Docker-gated, like `readpath.test.js`):** listings API
  (filtered query, 404, graceful-empty), importer idempotency.
- **Component:** `ListingCard`, `PropertyView` (collapsed default + Customize
  expand recompute), `CompareMatrix` (best-cell highlight, 2–4 columns).
- Maintain 80% coverage on `lib/`. Reuse the fixed jsdom setup.

## 9. Scope guardrails (YAGNI)

Out of scope: map view, live/real-time API, authentication, real photos,
write-back to the DB, mortgage pre-qual, and commercial-mode changes (this work
is residential-listing-focused; commercial calculator stays as-is).

## 10. Open follow-ups (not blocking)

- Exact list of in-scope states/metros (pick to maximize FMR/Census overlap).
- Whether `/saved` and `/compare` share one localStorage store or two.
- Optional later: RentCast free tier for a true "live lookup" bonus feature.
