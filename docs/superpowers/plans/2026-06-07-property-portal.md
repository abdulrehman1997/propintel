# Property-Search & Analysis Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users search real seeded US listings, open one to the existing tabbed analysis pre-filled, and compare 2–4 side by side.

**Architecture:** Seed a real Kaggle Realtor.com listings dataset into the existing Postgres (`listings` table) via a new importer. Read-only listings API routes serve them. A pure `listing-adapter` maps a listing + that ZIP's HUD FMR into the existing residential engine input, so the current `ResultsTabs` UI renders pre-filled. New App-Router pages — `/search`, `/property/[id]`, `/compare`, `/saved` — sit on top. No engine/scoring changes; all analysis stays client-side.

**Tech Stack:** Next.js 16 (App Router), React 19, Postgres (pg), node-cron seed pipeline, Recharts, Vitest + Testing Library, Tailwind.

---

## File Structure

**Create:**

- `updater/sql/listings.sql` — `listings` table DDL
- `updater/listings.js` — CSV → Postgres importer (idempotent upsert)
- `lib/db/listingsRepo.js` — query/getById data access
- `app/api/listings/route.js` — `GET /api/listings` (filtered, paginated, graceful)
- `app/api/listings/[id]/route.js` — `GET /api/listings/[id]`
- `app/lib/listing-adapter.js` — listing + FMR → residential engine input (pure)
- `app/lib/useListings.js` — client hook: fetch listings with filters
- `app/lib/compare-store.js` — localStorage-backed compare selection (context + hook)
- `app/components/listings/ListingCard.jsx`
- `app/components/listings/SearchFilters.jsx`
- `app/components/shell/Nav.jsx`
- `app/components/property/PropertyView.jsx` — input panel + ResultsTabs + Customize toggle (extracted from current page)
- `app/components/compare/CompareMatrix.jsx` — metric-rows table
- `app/search/page.jsx`
- `app/property/[id]/page.jsx`
- `app/compare/page.jsx`
- `app/saved/page.jsx`
- Tests alongside each (`*.test.js[x]`)

**Modify:**

- `updater/db.js` (or schema runner) — apply `listings.sql`
- `updater/seed.js` (or `package.json` seed script) — run the listings importer
- `app/page.jsx` — becomes a redirect to `/search`
- `lib/db/neighborhoodRepo.js` — export a small `getFmrByZip(zip)` helper if not already reusable

**Reuse unchanged:** `lib/finance|residential|commercial|scoring|brrrr`, `app/lib/engine-adapter.js`, `app/components/results/*`, `app/components/charts/*`, `app/lib/defaults.js`, `app/lib/format.js`, `test/setup.js`.

---

## Prerequisite: dataset download (manual, one-time)

The Kaggle CSV is large and license-gated; it is not committed. Before Phase 1 seeding:

```bash
# Option A: Kaggle CLI (needs ~/.kaggle/kaggle.json token)
kaggle datasets download -d ahmedshahriarsakib/usa-real-estate-dataset -p updater/data --unzip
# Option B: manual download from kaggle.com → place as:
#   updater/data/realtor-data.csv
```

Add `updater/data/` to `.gitignore`. The importer reads `updater/data/realtor-data.csv`.

---

## Phase 1 — Data

### Task 1: `listings` table schema

**Files:**

- Create: `updater/sql/listings.sql`
- Modify: `updater/db.js` (schema runner — apply the new file)
- Test: `updater/__tests__/listings-schema.test.js`

- [ ] **Step 1: Write the failing test**

```js
// updater/__tests__/listings-schema.test.js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sql = readFileSync(
  fileURLToPath(new URL("../sql/listings.sql", import.meta.url)),
  "utf8",
);

describe("listings.sql", () => {
  it("creates the listings table with required columns", () => {
    expect(sql).toMatch(/create table if not exists listings/i);
    for (const col of [
      "id",
      "source",
      "status",
      "street",
      "city",
      "state",
      "zip",
      "price",
      "beds",
      "baths",
      "sqft",
      "lot_acres",
      "property_type",
      "list_date",
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("indexes zip and price for search", () => {
    expect(sql).toMatch(/create index if not exists .*listings.*zip/i);
    expect(sql).toMatch(/create index if not exists .*listings.*price/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run updater/__tests__/listings-schema.test.js`
Expected: FAIL — cannot read `../sql/listings.sql` (file missing).

- [ ] **Step 3: Write the schema**

```sql
-- updater/sql/listings.sql
CREATE TABLE IF NOT EXISTS listings (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  status        TEXT NOT NULL,
  street        TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT NOT NULL,
  price         NUMERIC NOT NULL,
  beds          INTEGER,
  baths         NUMERIC,
  sqft          INTEGER,
  lot_acres     NUMERIC,
  property_type TEXT DEFAULT 'single_family',
  list_date     DATE,
  imported_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source, street, zip, price)
);
CREATE INDEX IF NOT EXISTS idx_listings_zip ON listings (zip);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_state_city ON listings (state, city);
CREATE INDEX IF NOT EXISTS idx_listings_beds ON listings (beds);
```

- [ ] **Step 4: Wire the schema into the runner**

In `updater/db.js`, locate where existing `sql/*.sql` files are read and applied (the `runSchema`/`applySchema` function). Add `listings.sql` to the list of applied files, following the exact existing pattern. (Read the file first; match how the other schema files are loaded.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run updater/__tests__/listings-schema.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add updater/sql/listings.sql updater/db.js updater/__tests__/listings-schema.test.js
git commit -m "feat(data): add listings table schema"
```

---

### Task 2: listing normalization (pure helper)

**Files:**

- Create: `updater/lib/normalizeListing.js`
- Test: `updater/__tests__/normalizeListing.test.js`

- [ ] **Step 1: Write the failing test**

```js
// updater/__tests__/normalizeListing.test.js
import { describe, it, expect } from "vitest";
import { normalizeListing, IN_SCOPE_STATES } from "../lib/normalizeListing.js";

const row = {
  brokered_by: "123",
  status: "for_sale",
  price: "285000",
  bed: "3",
  bath: "2",
  acre_lot: "0.18",
  street: "412 Mulberry St",
  city: "Harrisburg",
  state: "Pennsylvania",
  zip_code: "17101",
  house_size: "1540",
  prev_sold_date: "2019-05-01",
};

describe("normalizeListing", () => {
  it("maps a Realtor.com row to the listings shape", () => {
    const n = normalizeListing(row);
    expect(n).toMatchObject({
      source: "KAGGLE_REALTOR",
      status: "for_sale",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      price: 285000,
      beds: 3,
      baths: 2,
      sqft: 1540,
      lot_acres: 0.18,
      property_type: "single_family",
    });
  });

  it("pads ZIP to 5 digits", () => {
    expect(normalizeListing({ ...row, zip_code: "1701" }).zip).toBe("01701");
  });

  it("returns null when required fields are missing or out of scope", () => {
    expect(normalizeListing({ ...row, price: "" })).toBeNull();
    expect(normalizeListing({ ...row, zip_code: "" })).toBeNull();
    expect(normalizeListing({ ...row, bed: "" })).toBeNull();
    expect(normalizeListing({ ...row, status: "sold" })).toBeNull();
    expect(normalizeListing({ ...row, state: "California" })).toBeNull(); // not in scope
  });

  it("exposes the in-scope state allowlist", () => {
    expect(IN_SCOPE_STATES).toContain("PA");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run updater/__tests__/normalizeListing.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// updater/lib/normalizeListing.js
// Maps a raw Kaggle Realtor.com CSV row to the `listings` table shape.
// Returns null for rows that are out of scope or missing required fields.

const STATE_ABBR = {
  Pennsylvania: "PA",
  "New Jersey": "NJ",
  Maryland: "MD",
  Delaware: "DE",
  Ohio: "OH",
  "New York": "NY",
};

// In-scope states — chosen to overlap the seeded HUD/Census ZIPs.
export const IN_SCOPE_STATES = ["PA", "NJ", "MD", "DE", "OH", "NY"];

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function normalizeListing(row) {
  const status = (row.status || "").trim().toLowerCase();
  if (status !== "for_sale") return null;

  const state = STATE_ABBR[(row.state || "").trim()] || null;
  if (!state || !IN_SCOPE_STATES.includes(state)) return null;

  const zipRaw = (row.zip_code || "").trim();
  if (!zipRaw) return null;
  const zip = zipRaw.padStart(5, "0").slice(0, 5);

  const price = toNum(row.price);
  const beds = toInt(row.bed);
  if (price == null || price <= 0 || beds == null) return null;

  return {
    source: "KAGGLE_REALTOR",
    status: "for_sale",
    street: (row.street || "").trim() || null,
    city: (row.city || "").trim() || null,
    state,
    zip,
    price,
    beds,
    baths: toNum(row.bath),
    sqft: toInt(row.house_size),
    lot_acres: toNum(row.acre_lot),
    property_type: "single_family",
    list_date: (row.prev_sold_date || "").trim() || null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run updater/__tests__/normalizeListing.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add updater/lib/normalizeListing.js updater/__tests__/normalizeListing.test.js
git commit -m "feat(data): listing row normalization + scope filter"
```

---

### Task 3: importer (CSV → idempotent upsert)

**Files:**

- Create: `updater/listings.js`
- Modify: `package.json` (seed script) or `updater/seed.js`
- Test: `updater/__tests__/listings-import.test.js` (Docker-gated, like `readpath.test.js`)

- [ ] **Step 1: Write the failing test**

```js
// updater/__tests__/listings-import.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const hasDocker = !!process.env.DATABASE_URL;

describe.skipIf(!hasDocker)("upsertListings (real Postgres)", () => {
  let pool, upsertListings;
  const rows = [
    {
      source: "TEST",
      status: "for_sale",
      street: "1 Test St",
      city: "Harrisburg",
      state: "PA",
      zip: "17101",
      price: 200000,
      beds: 3,
      baths: 2,
      sqft: 1400,
      lot_acres: 0.1,
      property_type: "single_family",
      list_date: null,
    },
  ];

  beforeAll(async () => {
    ({ getPool } = await import("../../lib/db/pool.js").catch(() => ({})));
    ({ pool } = await import("../db.js"));
    ({ upsertListings } = await import("../listings.js"));
  });

  afterAll(async () => {
    await pool.query("DELETE FROM listings WHERE source='TEST'");
    await pool.end?.();
  });

  it("inserts then is idempotent on re-run", async () => {
    await upsertListings(rows);
    await upsertListings(rows); // same key → no duplicate
    const { rows: out } = await pool.query(
      "SELECT count(*)::int AS n FROM listings WHERE source='TEST'",
    );
    expect(out[0].n).toBe(1);
  });
});
```

> Note: match the exact pool/connection export used by the existing `updater` modules (read `updater/db.js` first). Adjust the imports above to that pattern.

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://propintel:ISEM54_propintel_dev_2026@localhost:5433/propintel npx vitest run updater/__tests__/listings-import.test.js`
Expected: FAIL — `../listings.js` not found.

- [ ] **Step 3: Write the importer**

```js
// updater/listings.js
// Imports the Kaggle Realtor.com CSV into the `listings` table.
// Idempotent: re-running upserts on (source, street, zip, price).
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import { pool } from "./db.js";
import { normalizeListing } from "./lib/normalizeListing.js";

const CSV_PATH = fileURLToPath(
  new URL("./data/realtor-data.csv", import.meta.url),
);

export async function upsertListings(rows) {
  for (const r of rows) {
    await pool.query(
      `INSERT INTO listings
         (source,status,street,city,state,zip,price,beds,baths,sqft,lot_acres,property_type,list_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (source, street, zip, price) DO UPDATE SET
         status=EXCLUDED.status, beds=EXCLUDED.beds, baths=EXCLUDED.baths,
         sqft=EXCLUDED.sqft, lot_acres=EXCLUDED.lot_acres,
         property_type=EXCLUDED.property_type, list_date=EXCLUDED.list_date,
         imported_at=now()`,
      [
        r.source,
        r.status,
        r.street,
        r.city,
        r.state,
        r.zip,
        r.price,
        r.beds,
        r.baths,
        r.sqft,
        r.lot_acres,
        r.property_type,
        r.list_date,
      ],
    );
  }
}

const MAX_ROWS = Number(process.env.LISTINGS_MAX || 40000);

export async function importListings() {
  const batch = [];
  let kept = 0;
  const parser = createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true }),
  );
  for await (const row of parser) {
    const n = normalizeListing(row);
    if (!n) continue;
    batch.push(n);
    kept++;
    if (batch.length >= 500) {
      await upsertListings(batch.splice(0));
    }
    if (kept >= MAX_ROWS) break;
  }
  if (batch.length) await upsertListings(batch);
  console.log(`listings: imported ${kept} rows`);
  return kept;
}

// Allow `node updater/listings.js` standalone.
if (import.meta.url === `file://${process.argv[1]}`) {
  importListings()
    .then(() => pool.end())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
```

> `csv-parse` is a small, well-established dep. If not already present: `npm i csv-parse`. Confirm with `npm ls csv-parse` before adding.

- [ ] **Step 4: Wire into seed**

In the seed entrypoint (the script behind `npm run seed` — read it first), call `importListings()` alongside the existing source imports, after `runSchema()`. Follow the existing ordering/error-isolation pattern.

- [ ] **Step 5: Run test to verify it passes**

Run: `DATABASE_URL=postgres://propintel:ISEM54_propintel_dev_2026@localhost:5433/propintel npx vitest run updater/__tests__/listings-import.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add updater/listings.js updater/__tests__/listings-import.test.js package.json
git commit -m "feat(data): listings CSV importer with idempotent upsert"
```

---

## Phase 2 — Repository & API

### Task 4: `listingsRepo`

**Files:**

- Create: `lib/db/listingsRepo.js`
- Test: `lib/db/__tests__/listingsRepo.test.js`

- [ ] **Step 1: Write the failing test** (unit-test the query builder, no DB)

```js
// lib/db/__tests__/listingsRepo.test.js
import { describe, it, expect } from "vitest";
import { buildListingsQuery } from "../listingsRepo.js";

describe("buildListingsQuery", () => {
  it("filters by zip, beds, and price range with params", () => {
    const { text, values } = buildListingsQuery({
      zip: "17101",
      beds: 3,
      minPrice: 100000,
      maxPrice: 300000,
      page: 2,
      pageSize: 24,
    });
    expect(text).toMatch(/where/i);
    expect(text).toMatch(/zip = \$\d/);
    expect(text).toMatch(/beds >= \$\d/);
    expect(text).toMatch(/price >= \$\d/);
    expect(text).toMatch(/price <= \$\d/);
    expect(text).toMatch(/limit \$\d offset \$\d/i);
    expect(values).toContain("17101");
    expect(values).toContain(24); // limit
    expect(values).toContain(24); // offset = (2-1)*24
  });

  it("only filters for_sale and applies defaults with no filters", () => {
    const { text, values } = buildListingsQuery({});
    expect(text).toMatch(/status = 'for_sale'/);
    expect(values).toContain(24); // default pageSize
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/db/__tests__/listingsRepo.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// lib/db/listingsRepo.js
import { getPool } from "./pool.js";

const DEFAULT_PAGE_SIZE = 24;

// Pure query builder — unit-testable without a DB.
export function buildListingsQuery(f = {}) {
  const where = ["status = 'for_sale'"];
  const values = [];
  const add = (clause, val) => {
    values.push(val);
    where.push(clause.replace("$?", `$${values.length}`));
  };
  if (f.zip) add("zip = $?", String(f.zip));
  if (f.state) add("state = $?", String(f.state).toUpperCase());
  if (f.city) add("lower(city) = lower($?)", String(f.city));
  if (f.beds) add("beds >= $?", Number(f.beds));
  if (f.minPrice) add("price >= $?", Number(f.minPrice));
  if (f.maxPrice) add("price <= $?", Number(f.maxPrice));

  const pageSize =
    Number(f.pageSize) > 0 ? Number(f.pageSize) : DEFAULT_PAGE_SIZE;
  const page = Number(f.page) > 0 ? Number(f.page) : 1;
  values.push(pageSize);
  const limitIdx = values.length;
  values.push((page - 1) * pageSize);
  const offsetIdx = values.length;

  const text = `SELECT id, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date
     FROM listings
     WHERE ${where.join(" AND ")}
     ORDER BY price ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  return { text, values };
}

export async function findListings(filters) {
  const { text, values } = buildListingsQuery(filters);
  const { rows } = await getPool().query(text, values);
  return rows;
}

export async function getListingById(id) {
  const { rows } = await getPool().query(
    `SELECT id, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date
     FROM listings WHERE id = $1`,
    [Number(id)],
  );
  return rows[0] || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/db/__tests__/listingsRepo.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db/listingsRepo.js lib/db/__tests__/listingsRepo.test.js
git commit -m "feat(api): listings repository + query builder"
```

---

### Task 5: `GET /api/listings`

**Files:**

- Create: `app/api/listings/route.js`
- Test: `app/api/listings/__tests__/route.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/api/listings/__tests__/route.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../lib/db/listingsRepo.js", () => ({
  findListings: vi.fn(),
}));

import { findListings } from "../../../../lib/db/listingsRepo.js";
import { GET } from "../route.js";

const req = (qs) => new Request(`http://localhost/api/listings?${qs}`);

describe("GET /api/listings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rows from the repo", async () => {
    findListings.mockResolvedValue([{ id: 1, price: 200000 }]);
    const res = await GET(req("zip=17101"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listings).toHaveLength(1);
    expect(findListings).toHaveBeenCalledWith(
      expect.objectContaining({ zip: "17101" }),
    );
  });

  it("degrades to an empty list when the DB throws", async () => {
    findListings.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listings).toEqual([]);
    expect(body.source).toBe("unavailable");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/listings/__tests__/route.test.js`
Expected: FAIL — `../route.js` not found.

- [ ] **Step 3: Write the route**

```js
// app/api/listings/route.js
import { NextResponse } from "next/server";
import { findListings } from "../../../lib/db/listingsRepo.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    zip: searchParams.get("zip") || undefined,
    state: searchParams.get("state") || undefined,
    city: searchParams.get("city") || undefined,
    beds: searchParams.get("beds") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    page: searchParams.get("page") || undefined,
  };
  try {
    const listings = await findListings(filters);
    return NextResponse.json({ listings, source: "postgres" });
  } catch (err) {
    // Listings are read-only context; an unseeded/unreachable DB degrades to
    // an empty list rather than a 500 that breaks the search page.
    console.error("Listings API error:", err);
    return NextResponse.json({ listings: [], source: "unavailable" });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/listings/__tests__/route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/listings/route.js app/api/listings/__tests__/route.test.js
git commit -m "feat(api): GET /api/listings with graceful degradation"
```

---

### Task 6: `GET /api/listings/[id]`

**Files:**

- Create: `app/api/listings/[id]/route.js`
- Test: `app/api/listings/[id]/__tests__/route.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/api/listings/[id]/__tests__/route.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../lib/db/listingsRepo.js", () => ({
  getListingById: vi.fn(),
}));

import { getListingById } from "../../../../../lib/db/listingsRepo.js";
import { GET } from "../route.js";

const ctx = (id) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/listings/1");

describe("GET /api/listings/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the listing when found", async () => {
    getListingById.mockResolvedValue({ id: 1, price: 200000 });
    const res = await GET(req(), ctx("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).listing.id).toBe(1);
  });

  it("404s when not found", async () => {
    getListingById.mockResolvedValue(null);
    const res = await GET(req(), ctx("999"));
    expect(res.status).toBe(404);
  });
});
```

> Next 16 passes `params` as a Promise — the route must `await context.params`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/listings/[id]/__tests__/route.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```js
// app/api/listings/[id]/route.js
import { NextResponse } from "next/server";
import { getListingById } from "../../../../lib/db/listingsRepo.js";

export async function GET(_request, context) {
  const { id } = await context.params;
  try {
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ listing });
  } catch (err) {
    console.error("Listing detail API error:", err);
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/listings/[id]/__tests__/route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/api/listings/[id]/route.js" "app/api/listings/[id]/__tests__/route.test.js"
git commit -m "feat(api): GET /api/listings/[id]"
```

---

## Phase 3 — Listing → analysis bridge

### Task 7: `listing-adapter`

**Files:**

- Create: `app/lib/listing-adapter.js`
- Test: `app/lib/listing-adapter.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/lib/listing-adapter.test.js
import { describe, it, expect } from "vitest";
import { listingToResidentialInputs } from "./listing-adapter.js";

const listing = {
  id: 1,
  price: 285000,
  beds: 3,
  baths: 2,
  sqft: 1540,
  zip: "17101",
  city: "Harrisburg",
  state: "PA",
};

describe("listingToResidentialInputs", () => {
  it("uses listing price and FMR rent for the matching bedroom", () => {
    const fmr = { studio: 900, oneBed: 1100, twoBed: 1400, threeBed: 1750 };
    const inp = listingToResidentialInputs(listing, fmr);
    expect(inp.purchasePrice).toBe(285000);
    expect(inp.monthlyRent).toBe(1750); // 3BR
    expect(inp.bedrooms).toBe(3);
    expect(inp.zipCode).toBe("17101");
  });

  it("falls back through bedroom tiers then to a price ratio when FMR missing", () => {
    expect(
      listingToResidentialInputs(listing, { twoBed: 1400 }).monthlyRent,
    ).toBe(1400); // 3BR missing → twoBed
    const noFmr = listingToResidentialInputs(listing, {});
    expect(noFmr.monthlyRent).toBeGreaterThan(0); // price-based fallback (~0.7% rule)
  });

  it("estimates property tax as a percent of price and keeps engine defaults", () => {
    const inp = listingToResidentialInputs(listing, { threeBed: 1750 });
    expect(inp.annualPropertyTax).toBeCloseTo(285000 * 0.011, 0);
    expect(inp.downPaymentPct).toBe(20);
    expect(inp.interestRate).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/listing-adapter.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// app/lib/listing-adapter.js
// Pure bridge: a listings row + that ZIP's HUD FMR -> the residential engine
// input object consumed by analyzeResidentialDeal. No engine changes.
import { DEFAULT_RESIDENTIAL } from "./defaults.js";

const PROPERTY_TAX_RATE = 0.011; // ~1.1% of price/yr when the dataset lacks tax

// Pick the FMR closest to the listing's bedroom count, with graceful fallback.
function rentFromFmr(fmr = {}, beds) {
  const byBeds = {
    0: fmr.studio,
    1: fmr.oneBed,
    2: fmr.twoBed,
    3: fmr.threeBed,
    4: fmr.fourBed,
  };
  const order =
    beds >= 4
      ? [fmr.fourBed, fmr.threeBed, fmr.twoBed]
      : beds === 3
        ? [fmr.threeBed, fmr.twoBed, fmr.fourBed, fmr.oneBed]
        : beds === 2
          ? [fmr.twoBed, fmr.threeBed, fmr.oneBed]
          : beds === 1
            ? [fmr.oneBed, fmr.twoBed, fmr.studio]
            : [fmr.studio, fmr.oneBed];
  const hit = byBeds[beds] ?? order.find((v) => v != null);
  return hit != null ? Number(hit) : null;
}

export function listingToResidentialInputs(listing, fmr) {
  const price = Number(listing.price) || 0;
  const beds = Number(listing.beds) || 0;
  // FMR rent, else a conservative 0.7%-of-price monthly fallback.
  const rent = rentFromFmr(fmr, beds) ?? Math.round(price * 0.007);

  return {
    ...DEFAULT_RESIDENTIAL,
    purchasePrice: price,
    bedrooms: beds,
    zipCode: listing.zip || "",
    monthlyRent: rent,
    annualPropertyTax: Math.round(price * PROPERTY_TAX_RATE),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/lib/listing-adapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/listing-adapter.js app/lib/listing-adapter.test.js
git commit -m "feat(analysis): listing -> residential engine input adapter"
```

---

## Phase 4 — Frontend

### Task 8: extract `PropertyView` from current page

**Files:**

- Create: `app/components/property/PropertyView.jsx`
- Test: `app/components/property/PropertyView.test.jsx`
- Reference: `app/page.jsx` (current input-panel + `ResultsTabs` composition)

**Goal:** Move the current "input panel + ResultsTabs" composition into a reusable component that accepts initial residential inputs and renders the full tabbed analysis. The inputs panel is **collapsed by default** behind a "Customize" button. This is what `/property/[id]` renders pre-filled, and what the existing experience reduces to.

- [ ] **Step 1: Write the failing test**

```jsx
// app/components/property/PropertyView.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children }) => <div>{children}</div>,
    },
  ),
  AnimatePresence: ({ children }) => children,
}));

import { PropertyView } from "./PropertyView";

const inputs = {
  purchasePrice: 285000,
  downPaymentPct: 20,
  interestRate: 7,
  loanTermYears: 30,
  annualPropertyTax: 3135,
  annualInsurance: 1800,
  monthlyHOA: 0,
  monthlyRent: 1750,
  vacancyPct: 5,
  managementPct: 10,
  maintenancePct: 1,
  capExPct: 5,
  holdYears: 5,
  appreciationPct: 3,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  exitCapRate: 0,
  saleCostPct: 6,
  bedrooms: 3,
  zipCode: "17101",
};

describe("PropertyView", () => {
  it("renders the tabbed analysis with the inputs collapsed by default", () => {
    render(<PropertyView initialInputs={inputs} />);
    expect(screen.getByText("Deal Analysis")).toBeInTheDocument();
    // The numeric inputs are hidden until Customize is clicked.
    expect(screen.queryByLabelText(/purchase price/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /customize/i }),
    ).toBeInTheDocument();
  });

  it("reveals editable inputs when Customize is clicked", () => {
    render(<PropertyView initialInputs={inputs} />);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(
      screen.getByText(/Property & Purchase|Purchase Price/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/property/PropertyView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PropertyView`**

Extract the residential branch of `app/page.jsx` into this component. It owns: `inputs` state (seeded from `initialInputs`), `activeTab`, `copied`, the `handleInputChange`/`copyResults` handlers, `useDealAnalysis`, `residentialStressTests`, `analyzeBrrrrDeal`, and renders `<ResultsTabs .../>`. Add a `showInputs` boolean (default `false`) and a "Customize" toggle button; render `<ResidentialInputs>` only when `showInputs`. Read the current `app/page.jsx` and lift the relevant pieces verbatim.

```jsx
// app/components/property/PropertyView.jsx
"use client";
import { useState, useCallback, useMemo } from "react";
import { useDealAnalysis } from "../../hooks/useDealAnalysis";
import {
  residentialStressTests,
  analyzeBrrrrDeal,
} from "../../lib/engine-adapter";
import { formatCurrency, formatPercent } from "../../lib/format";
import { ResidentialInputs } from "../inputs/ResidentialInputs";
import { ResultsTabs } from "../results/ResultsTabs";

const PASSTHROUGH_KEYS = ["zipCode", "bedrooms"];

export function PropertyView({ initialInputs, neighborhoodData = null }) {
  const [inputs, setInputs] = useState(initialInputs);
  const [showInputs, setShowInputs] = useState(false);
  const [activeTab, setActiveTab] = useState("deal");
  const [copied, setCopied] = useState(false);

  const { results, projections } = useDealAnalysis(
    "residential",
    inputs,
    neighborhoodData,
  );

  const handleInputChange = useCallback((key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: PASSTHROUGH_KEYS.includes(key) ? value : parseFloat(value) || 0,
    }));
  }, []);

  const copyResults = () => {
    navigator.clipboard?.writeText(
      `PropIntel — Grade ${results.investmentGrade} (${Math.round(results.investmentScore)}), ` +
        `CF ${formatCurrency(results.monthlyCashFlow)}/mo, CoC ${formatPercent(results.cashOnCash)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stressScenarios = useMemo(
    () => residentialStressTests(inputs),
    [inputs],
  );
  const brrrrResults = useMemo(() => analyzeBrrrrDeal(inputs), [inputs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowInputs((v) => !v)}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500 hover:text-forest-700 border border-paper-200 hover:border-forest-300 rounded-full px-4 py-2.5"
        >
          {showInputs ? "Hide inputs" : "Customize"}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {showInputs && (
          <div className="lg:col-span-5 space-y-4">
            <ResidentialInputs
              inputs={inputs}
              results={results}
              onChange={handleInputChange}
              errors={{}}
            />
          </div>
        )}
        <div className={showInputs ? "lg:col-span-7" : "lg:col-span-12"}>
          <ResultsTabs
            mode="residential"
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            results={results}
            projections={projections}
            residentialInputs={inputs}
            stressScenarios={stressScenarios}
            brrrrResults={brrrrResults}
            onInputChange={handleInputChange}
            neighborhoodData={neighborhoodData}
            copied={copied}
            onCopy={copyResults}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/components/property/PropertyView.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/property/PropertyView.jsx app/components/property/PropertyView.test.jsx
git commit -m "feat(property): reusable PropertyView (tabbed analysis, collapsible inputs)"
```

---

### Task 9: compare-selection store + Nav

**Files:**

- Create: `app/lib/compare-store.js`
- Create: `app/components/shell/Nav.jsx`
- Test: `app/lib/compare-store.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/lib/compare-store.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CompareProvider, useCompare } from "./compare-store.js";

const wrapper = ({ children }) => <CompareProvider>{children}</CompareProvider>;

describe("useCompare", () => {
  beforeEach(() => localStorage.clear());

  it("adds, caps at 4, and removes by id", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => {
      [1, 2, 3, 4, 5].forEach((id) => result.current.add({ id, price: id }));
    });
    expect(result.current.items).toHaveLength(4); // capped
    act(() => result.current.remove(1));
    expect(result.current.items.find((i) => i.id === 1)).toBeUndefined();
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => result.current.add({ id: 9, price: 100 }));
    expect(localStorage.getItem("propintel.compare.v1")).toContain("9");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/compare-store.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

```jsx
// app/lib/compare-store.js
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const KEY = "propintel.compare.v1";
const MAX = 4;
const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore malformed */
    }
  }, []);

  const persist = (next) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  const add = (listing) => {
    persist(
      (() => {
        if (items.find((i) => i.id === listing.id)) return items;
        if (items.length >= MAX) return items;
        return [...items, listing];
      })(),
    );
  };
  const remove = (id) => persist(items.filter((i) => i.id !== id));
  const clear = () => persist([]);

  return (
    <CompareContext.Provider value={{ items, add, remove, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
```

- [ ] **Step 4: Implement Nav (no test — presentational)**

```jsx
// app/components/shell/Nav.jsx
"use client";
import Link from "next/link";
import { useCompare } from "../../lib/compare-store";

export function Nav() {
  const { items } = useCompare();
  return (
    <nav className="flex items-center gap-6 px-6 md:px-10 py-4 border-b border-paper-200 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
      <Link
        href="/search"
        className="font-display text-forest-700 text-base normal-case tracking-normal"
      >
        PropIntel
      </Link>
      <Link href="/search" className="hover:text-forest-700">
        Search
      </Link>
      <Link href="/saved" className="hover:text-forest-700">
        Saved
      </Link>
      <Link href="/compare" className="ml-auto hover:text-forest-700">
        Compare ({items.length})
      </Link>
    </nav>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/lib/compare-store.test.js`
Expected: PASS.

- [ ] **Step 6: Wire `CompareProvider` + `Nav` into the layout**

In `app/layout.js`, wrap `{children}` with `<CompareProvider>` and render `<Nav />` above it. Read `app/layout.js` first and follow its structure.

- [ ] **Step 7: Commit**

```bash
git add app/lib/compare-store.js app/lib/compare-store.test.js app/components/shell/Nav.jsx app/layout.js
git commit -m "feat(compare): localStorage compare-selection store + nav"
```

---

### Task 10: `ListingCard` + `/search`

**Files:**

- Create: `app/components/listings/ListingCard.jsx`
- Create: `app/components/listings/SearchFilters.jsx`
- Create: `app/lib/useListings.js`
- Create: `app/search/page.jsx`
- Test: `app/components/listings/ListingCard.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// app/components/listings/ListingCard.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListingCard } from "./ListingCard";

const listing = {
  id: 1,
  street: "412 Mulberry St",
  city: "Harrisburg",
  state: "PA",
  zip: "17101",
  price: 285000,
  beds: 3,
  baths: 2,
  sqft: 1540,
};

describe("ListingCard", () => {
  it("shows price, address, and bed/bath/sqft", () => {
    render(<ListingCard listing={listing} onCompare={() => {}} />);
    expect(screen.getByText("$285,000")).toBeInTheDocument();
    expect(screen.getByText(/Harrisburg, PA/)).toBeInTheDocument();
    expect(screen.getByText(/3 bd/)).toBeInTheDocument();
  });

  it("fires onCompare when the compare button is clicked", () => {
    const onCompare = vi.fn();
    render(<ListingCard listing={listing} onCompare={onCompare} />);
    fireEvent.click(screen.getByRole("button", { name: /compare/i }));
    expect(onCompare).toHaveBeenCalledWith(listing);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/listings/ListingCard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ListingCard`**

```jsx
// app/components/listings/ListingCard.jsx
"use client";
import Link from "next/link";
import { formatCurrency } from "../../lib/format";

export function ListingCard({ listing: l, onCompare }) {
  return (
    <div className="card-shell p-2">
      <div className="card-core overflow-hidden">
        <div className="placeholder h-40 flex items-center justify-center text-ink-300">
          {l.city}
        </div>
        <div className="p-4 space-y-1">
          <p className="font-display text-xl font-medium text-ink-900">
            {formatCurrency(l.price)}
          </p>
          <p className="text-sm text-ink-600">
            {l.street}, {l.city}, {l.state} {l.zip}
          </p>
          <p className="text-xs text-ink-400">
            {l.beds} bd · {l.baths ?? "—"} ba ·{" "}
            {l.sqft ? `${l.sqft} sqft` : "— sqft"}
          </p>
          <div className="flex gap-2 pt-2">
            <Link
              href={`/property/${l.id}`}
              className="flex-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] bg-forest-700 text-paper-50 rounded-full px-4 py-2.5 hover:bg-forest-800"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => onCompare(l)}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] border border-paper-200 hover:border-forest-300 rounded-full px-4 py-2.5"
            >
              ＋ Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `useListings`, `SearchFilters`, `/search` page (no separate test — covered by card test + manual)**

```js
// app/lib/useListings.js
"use client";
import { useEffect, useState } from "react";

export function useListings(filters) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    ).toString();
    let active = true;
    setLoading(true);
    fetch(`/api/listings?${qs}`)
      .then((r) => r.json())
      .then((d) => active && setListings(d.listings || []))
      .catch(() => active && setListings([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [JSON.stringify(filters)]);
  return { listings, loading };
}
```

```jsx
// app/components/listings/SearchFilters.jsx
"use client";
export function SearchFilters({ filters, onChange }) {
  const set = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const input =
    "px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 outline-none";
  return (
    <div className="flex flex-wrap gap-2">
      <input
        className={`${input} flex-1 min-w-0`}
        placeholder="City or ZIP"
        value={filters.q || ""}
        onChange={set("q")}
      />
      <input
        className={input}
        type="number"
        placeholder="Min $"
        value={filters.minPrice || ""}
        onChange={set("minPrice")}
      />
      <input
        className={input}
        type="number"
        placeholder="Max $"
        value={filters.maxPrice || ""}
        onChange={set("maxPrice")}
      />
      <input
        className={input}
        type="number"
        placeholder="Beds"
        value={filters.beds || ""}
        onChange={set("beds")}
      />
    </div>
  );
}
```

```jsx
// app/search/page.jsx
"use client";
import { useState } from "react";
import { useListings } from "../lib/useListings";
import { useCompare } from "../lib/compare-store";
import { SearchFilters } from "../components/listings/SearchFilters";
import { ListingCard } from "../components/listings/ListingCard";

// Map the free-text q box to zip (5 digits) or city.
function toApiFilters({ q, minPrice, maxPrice, beds }) {
  const f = { minPrice, maxPrice, beds };
  if (/^\d{5}$/.test((q || "").trim())) f.zip = q.trim();
  else if (q) f.city = q.trim();
  return f;
}

export default function SearchPage() {
  const [filters, setFilters] = useState({ q: "Harrisburg" });
  const { listings, loading } = useListings(toApiFilters(filters));
  const { add } = useCompare();

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-8">
      <h1 className="font-display text-2xl font-medium text-ink-900">
        Find a property
      </h1>
      <SearchFilters filters={filters} onChange={setFilters} />
      {loading ? (
        <p className="text-ink-400 text-sm">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="text-ink-400 text-sm">
          No listings. Seed the database (npm run seed) or adjust filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onCompare={add} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/components/listings/ListingCard.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/listings app/lib/useListings.js app/search/page.jsx
git commit -m "feat(search): listings search page, card, filters, useListings hook"
```

---

### Task 11: `/property/[id]` page

**Files:**

- Create: `app/property/[id]/page.jsx`
- Create: `app/property/[id]/PropertyClient.jsx`
- Test: `app/property/[id]/PropertyClient.test.jsx`

**Approach:** The `page.jsx` is a server component that fetches the listing + FMR and passes them to a client component (`PropertyClient`) which builds engine inputs via the adapter and renders `PropertyView`.

- [ ] **Step 1: Write the failing test**

```jsx
// app/property/[id]/PropertyClient.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children }) => <div>{children}</div>,
    },
  ),
  AnimatePresence: ({ children }) => children,
}));

import { PropertyClient } from "./PropertyClient";

const listing = {
  id: 1,
  street: "412 Mulberry St",
  city: "Harrisburg",
  state: "PA",
  zip: "17101",
  price: 285000,
  beds: 3,
  baths: 2,
  sqft: 1540,
};

describe("PropertyClient", () => {
  it("renders the address and the pre-filled tabbed analysis", () => {
    render(
      <PropertyClient
        listing={listing}
        fmr={{ threeBed: 1750 }}
        neighborhood={null}
      />,
    );
    expect(screen.getByText(/412 Mulberry St/)).toBeInTheDocument();
    expect(screen.getByText("Deal Analysis")).toBeInTheDocument();
    expect(screen.getByText(/\$285,000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/property/[id]/PropertyClient.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PropertyClient`**

```jsx
// app/property/[id]/PropertyClient.jsx
"use client";
import { useMemo } from "react";
import { listingToResidentialInputs } from "../../lib/listing-adapter";
import { formatCurrency } from "../../lib/format";
import { PropertyView } from "../../components/property/PropertyView";

export function PropertyClient({ listing, fmr, neighborhood }) {
  const initialInputs = useMemo(
    () => listingToResidentialInputs(listing, fmr || {}),
    [listing, fmr],
  );
  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-medium text-ink-900">
          {listing.street}
        </h1>
        <p className="text-ink-500">
          {listing.city}, {listing.state} {listing.zip} ·{" "}
          {formatCurrency(listing.price)} · {listing.beds} bd ·{" "}
          {listing.baths ?? "—"} ba ·{" "}
          {listing.sqft ? `${listing.sqft} sqft` : "— sqft"}
        </p>
      </header>
      <PropertyView
        initialInputs={initialInputs}
        neighborhoodData={neighborhood}
      />
    </main>
  );
}
```

- [ ] **Step 4: Implement the server `page.jsx`**

```jsx
// app/property/[id]/page.jsx
import { getListingById } from "../../../lib/db/listingsRepo.js";
import { getNeighborhoodFromDb } from "../../../lib/db/neighborhoodRepo.js";
import { PropertyClient } from "./PropertyClient";

export default async function PropertyPage({ params }) {
  const { id } = await params;
  let listing = null;
  let neighborhood = null;
  try {
    listing = await getListingById(id);
    if (listing?.zip) neighborhood = await getNeighborhoodFromDb(listing.zip);
  } catch {
    /* degrade: render not-found below */
  }
  if (!listing) {
    return (
      <main className="max-w-[1240px] mx-auto px-6 py-20 text-center text-ink-500">
        Listing not found. Seed the database (npm run seed) or go back to
        search.
      </main>
    );
  }
  const fmr = neighborhood?.fmr || {};
  return (
    <PropertyClient listing={listing} fmr={fmr} neighborhood={neighborhood} />
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/property/[id]/PropertyClient.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/property/[id]"
git commit -m "feat(property): /property/[id] page pre-filled from listing + FMR"
```

---

### Task 12: `CompareMatrix` + `/compare`

**Files:**

- Create: `app/components/compare/CompareMatrix.jsx`
- Create: `app/compare/page.jsx`
- Test: `app/components/compare/CompareMatrix.test.jsx`

**Approach:** `/compare` reads selected listings from `useCompare`, fetches FMR per ZIP (reuse `/api/neighborhood`), runs each through `listingToResidentialInputs` + `analyzeResidentialDeal`, and renders the metric-rows matrix with best-cell highlight.

- [ ] **Step 1: Write the failing test**

```jsx
// app/components/compare/CompareMatrix.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompareMatrix } from "./CompareMatrix";

const cols = [
  {
    listing: {
      id: 1,
      street: "A St",
      city: "X",
      state: "PA",
      zip: "1",
      price: 250000,
      beds: 3,
    },
    results: {
      investmentGrade: "A",
      investmentScore: 81,
      monthlyCashFlow: 465,
      cashOnCash: 8.9,
      capRate: 6,
      irr: 14,
      dscr: 1.41,
    },
  },
  {
    listing: {
      id: 2,
      street: "B St",
      city: "Y",
      state: "PA",
      zip: "2",
      price: 312000,
      beds: 4,
    },
    results: {
      investmentGrade: "C",
      investmentScore: 58,
      monthlyCashFlow: 120,
      cashOnCash: 3.1,
      capRate: 4.2,
      irr: 7.5,
      dscr: 1.05,
    },
  },
];

describe("CompareMatrix", () => {
  it("renders a column per property and a row per metric", () => {
    render(<CompareMatrix columns={cols} onRemove={() => {}} />);
    expect(screen.getByText("A St")).toBeInTheDocument();
    expect(screen.getByText("B St")).toBeInTheDocument();
    expect(screen.getByText(/Cash flow/i)).toBeInTheDocument();
    expect(screen.getByText("$465")).toBeInTheDocument();
  });

  it("highlights the best cell in a row (highest cash flow)", () => {
    render(<CompareMatrix columns={cols} onRemove={() => {}} />);
    const best = screen.getByText("$465").closest("td");
    expect(best.className).toMatch(/emerald|best/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/components/compare/CompareMatrix.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CompareMatrix`**

```jsx
// app/components/compare/CompareMatrix.jsx
"use client";
import { cn } from "../../lib/cn";
import { formatCurrency, formatPercent } from "../../lib/format";

// rows: [label, accessor, formatter, higherIsBetter]
const ROWS = [
  ["Price", (c) => c.listing.price, formatCurrency, false],
  ["Beds", (c) => c.listing.beds, (v) => v, true],
  [
    "Grade",
    (c) => c.results.investmentScore,
    (v, c) => `${c.results.investmentGrade} (${Math.round(v)})`,
    true,
  ],
  ["Cash flow/mo", (c) => c.results.monthlyCashFlow, formatCurrency, true],
  ["CoC", (c) => c.results.cashOnCash, formatPercent, true],
  ["Cap rate", (c) => c.results.capRate, formatPercent, true],
  ["IRR", (c) => c.results.irr, formatPercent, true],
  [
    "DSCR",
    (c) => c.results.dscr,
    (v) => (v == null ? "N/A" : v.toFixed(2)),
    true,
  ],
];

export function CompareMatrix({ columns, onRemove }) {
  const bestIndex = (accessor, higher) => {
    const vals = columns.map((c) => Number(accessor(c)));
    const target = higher ? Math.max(...vals) : Math.min(...vals);
    return vals.indexOf(target);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-paper-200 text-left">
            <th className="p-2 w-32" />
            {columns.map((c) => (
              <th key={c.listing.id} className="p-2 align-top">
                <div className="font-display text-ink-900">
                  {c.listing.street}
                </div>
                <div className="text-ink-400 text-xs">
                  {c.listing.city}, {c.listing.state}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(c.listing.id)}
                  className="text-[10px] uppercase tracking-widest text-rose-500 mt-1"
                >
                  ✕ remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {ROWS.map(([label, accessor, fmt, higher]) => {
            const best = bestIndex(accessor, higher);
            return (
              <tr key={label} className="border-b border-paper-200">
                <td className="p-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">
                  {label}
                </td>
                {columns.map((c, i) => (
                  <td
                    key={c.listing.id}
                    className={cn(
                      "p-2",
                      i === best &&
                        "bg-emerald-50 font-semibold text-emerald-800",
                    )}
                  >
                    {fmt(accessor(c), c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Implement `/compare` page**

```jsx
// app/compare/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useCompare } from "../lib/compare-store";
import { listingToResidentialInputs } from "../lib/listing-adapter";
import { analyzeResidentialDeal } from "../lib/engine-adapter";
import { CompareMatrix } from "../components/compare/CompareMatrix";

export default function ComparePage() {
  const { items, remove } = useCompare();
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all(
      items.map(async (listing) => {
        let fmr = {};
        try {
          const r = await fetch(`/api/neighborhood?zip=${listing.zip}`);
          const d = await r.json();
          fmr = d.fmr || {};
        } catch {
          /* degrade to price-based rent */
        }
        const results = analyzeResidentialDeal(
          listingToResidentialInputs(listing, fmr),
        );
        return { listing, results };
      }),
    ).then((cols) => active && setColumns(cols));
    return () => {
      active = false;
    };
  }, [items]);

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <h1 className="font-display text-2xl font-medium text-ink-900">
        Compare ({items.length})
      </h1>
      {columns.length === 0 ? (
        <p className="text-ink-400 text-sm">
          No properties selected. Add up to 4 from search.
        </p>
      ) : (
        <CompareMatrix columns={columns} onRemove={remove} />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/components/compare/CompareMatrix.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/compare/CompareMatrix.jsx app/compare/page.jsx
git commit -m "feat(compare): side-by-side metric matrix + /compare page"
```

---

### Task 13: `/saved` page + save action

**Files:**

- Create: `app/saved/page.jsx`
- Create: `app/lib/saved-listings.js` (localStorage hook for saved listings)
- Test: `app/lib/saved-listings.test.js`

- [ ] **Step 1: Write the failing test**

```js
// app/lib/saved-listings.test.js
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedListings } from "./saved-listings.js";

describe("useSavedListings", () => {
  beforeEach(() => localStorage.clear());

  it("saves and removes listings, deduped by id", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => result.current.save({ id: 1, price: 100 }));
    act(() => result.current.save({ id: 1, price: 100 })); // dedupe
    expect(result.current.saved).toHaveLength(1);
    act(() => result.current.remove(1));
    expect(result.current.saved).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/lib/saved-listings.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```js
// app/lib/saved-listings.js
"use client";
import { useEffect, useState } from "react";

const KEY = "propintel.savedListings.v1";

export function useSavedListings() {
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  const persist = (next) => {
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const save = (l) =>
    persist(saved.find((s) => s.id === l.id) ? saved : [...saved, l]);
  const remove = (id) => persist(saved.filter((s) => s.id !== id));
  return { saved, save, remove };
}
```

- [ ] **Step 4: Implement `/saved` page**

```jsx
// app/saved/page.jsx
"use client";
import { useSavedListings } from "../lib/saved-listings";
import { useCompare } from "../lib/compare-store";
import { ListingCard } from "../components/listings/ListingCard";

export default function SavedPage() {
  const { saved } = useSavedListings();
  const { add } = useCompare();
  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <h1 className="font-display text-2xl font-medium text-ink-900">
        Saved properties
      </h1>
      {saved.length === 0 ? (
        <p className="text-ink-400 text-sm">
          Nothing saved yet. Save a property from its page.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {saved.map((l) => (
            <ListingCard key={l.id} listing={l} onCompare={add} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Wire the Save action into `PropertyClient`**

In `PropertyClient.jsx`, import `useSavedListings`, add a "♥ Save" button in the header that calls `save(listing)`. (Small additive edit — keep the existing test passing.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run app/lib/saved-listings.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/saved/page.jsx app/lib/saved-listings.js app/lib/saved-listings.test.js "app/property/[id]/PropertyClient.jsx"
git commit -m "feat(saved): saved-listings store + /saved page + save action"
```

---

### Task 14: root redirect `/` → `/search`

**Files:**

- Modify: `app/page.jsx`
- Test: none (trivial redirect)

- [ ] **Step 1: Replace `app/page.jsx` with a redirect**

```jsx
// app/page.jsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/search");
}
```

> The old App logic now lives in `PropertyView` (Task 8); the standalone manual page is superseded by `/property/[id]`. Delete `app/page.test.jsx` (it tested the old single-page App) in this commit.

- [ ] **Step 2: Verify build + full suite**

Run: `npx vitest run`
Expected: all pass (former page.test.jsx removed).
Run: `npm run build`
Expected: routes `/`, `/search`, `/property/[id]`, `/compare`, `/saved`, `/api/listings`, `/api/listings/[id]`, `/api/neighborhood` present; build clean.

- [ ] **Step 3: Commit**

```bash
git add app/page.jsx
git rm app/page.test.jsx
git commit -m "feat(nav): redirect / to /search; retire single-page calculator"
```

---

## Phase 5 — End-to-end verification

### Task 15: seed + manual smoke test

- [ ] **Step 1: Seed listings** (after downloading the CSV per the prerequisite)

```bash
docker compose up -d db
DATABASE_URL=postgres://propintel:ISEM54_propintel_dev_2026@localhost:5433/propintel npm run seed
```

Expected: `listings: imported N rows` in the log.

- [ ] **Step 2: Run the full suite with DB**

```bash
DATABASE_URL=postgres://propintel:ISEM54_propintel_dev_2026@localhost:5433/propintel npx vitest run
```

Expected: all pass, 0 skipped.

- [ ] **Step 3: Manual smoke (dev server)**

- `/search` → search "Harrisburg" → cards render.
- Click a card → `/property/[id]` → tabbed analysis renders pre-filled; "Customize" reveals inputs and edits recompute.
- ＋Compare on 2–3 cards → Nav count rises → `/compare` → matrix with best-cell highlight.
- ♥ Save on a property → `/saved` shows it.
- Resize to 320px → no horizontal overflow.

- [ ] **Step 4: Final commit (if any fixups)**

```bash
git add -A && git commit -m "chore: property portal e2e verification fixups"
```

---

## Self-Review

- **Spec coverage:** §3 data → T1–T3; §4.1 search → T10; §4.2 property → T8,T11; §4.3 compare → T9,T12; §4.4 saved → T13; §4.5 nav → T9; §5 adapter → T7; §6 API/state → T4–T6,T9,T13; §7 reuse/`page.jsx`→search → T8,T14; §8 testing → tests in every task. Covered.
- **Placeholders:** none — every code step shows full code; manual-wiring steps (schema runner, seed entry, layout) explicitly say "read the file first, match the pattern" because those files' exact contents vary and must be followed verbatim.
- **Type consistency:** `listingToResidentialInputs(listing, fmr)` signature consistent across T7/T11/T12; `useCompare().{items,add,remove}` consistent T9/T10/T12/T13; FMR keys (`studio/oneBed/twoBed/threeBed/fourBed`) match `neighborhoodRepo`/existing neighborhood shape; `analyzeResidentialDeal` reused unchanged.
- **Dependency note:** `csv-parse` may need install (T3) — verify before adding.
