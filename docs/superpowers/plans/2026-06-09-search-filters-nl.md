# Search Filters + Local-LLM NL Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new search filters (baths, property_type, status, min yield, deal grade) and a local-Qwen natural-language box that fills those filters, built isolated in the `feat/search-filters-nl` worktree.

**Architecture:** Filters derive from existing `listings` columns — no DB migration. The query builder gains parameterized clauses + a `deal_grade` SELECT expression. A new `/api/nl-filter` route calls Ollama (`qwen2.5:7b`) with a JSON schema, validates the result through Zod `.strict()`, and degrades to `{error}` if Ollama is down. A new `NLSearchBox` posts to it and calls `setFilters`.

**Tech Stack:** Next.js 16 (app router), React 19, `pg`, `zod`, `vitest` + Testing Library, Ollama + Qwen2.5-7B.

**Working dir for ALL tasks:** `/Users/abdulrehman/Desktop/Harrisburg/ISEM 564/propintel-feat` (the worktree). Never edit the `Real estate project` master tree.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `lib/db/listingsRepo.js` | Query builder: new WHERE clauses + `deal_grade` column | Modify |
| `lib/db/__tests__/listingsRepo.test.js` | Unit tests for new clauses | Modify |
| `app/api/listings/route.js` | Forward new query params to `findListings` | Modify |
| `app/api/listings/__tests__/route.test.js` | Assert new params forwarded | Modify |
| `app/components/listings/SearchFilters.jsx` | 5 new UI controls | Modify |
| `app/search/page.jsx` | Forward new keys via `toApiFilters`; mount `NLSearchBox` | Modify |
| `lib/nl/filterSchema.js` | Shared Zod schema + system prompt | Create |
| `app/api/nl-filter/route.js` | POST → Ollama → Zod → filter object / `{error}` | Create |
| `app/api/nl-filter/__tests__/route.test.js` | Route unit tests (mock fetch) | Create |
| `app/components/listings/NLSearchBox.jsx` | NL input → POST → `setFilters` | Create |
| `app/components/listings/NLSearchBox.test.jsx` | Component tests | Create |
| `.env.example` | Document `OLLAMA_URL`, `OLLAMA_MODEL` | Modify |
| `docs/OLLAMA_SETUP.md` | One-time Ollama install/run steps | Create |

---

## Task 1: Query builder — new filter clauses + deal_grade column

**Files:**
- Modify: `lib/db/listingsRepo.js`
- Test: `lib/db/__tests__/listingsRepo.test.js`

- [ ] **Step 1: Write failing tests** — append inside the `describe("buildListingsQuery", ...)` block in `lib/db/__tests__/listingsRepo.test.js`:

```js
  it("filters by minBaths with a param", () => {
    const { text } = buildListingsQuery({ minBaths: 2 });
    expect(text).toMatch(/baths >= \$\d/);
  });

  it("filters by propertyType with a param", () => {
    const { text, values } = buildListingsQuery({ propertyType: "condo" });
    expect(text).toMatch(/property_type = \$\d/);
    expect(values).toContain("condo");
  });

  it("status filter overrides the default IN clause", () => {
    const { text, values } = buildListingsQuery({ status: "for_sale" });
    expect(text).toMatch(/status = \$\d/);
    expect(text).not.toMatch(/status IN/);
    expect(values).toContain("for_sale");
  });

  it("keeps default status IN clause when status omitted", () => {
    const { text } = buildListingsQuery({});
    expect(text).toMatch(/status IN \('for_sale', 'sold'\)/);
  });

  it("ignores an invalid status and keeps the default", () => {
    const { text } = buildListingsQuery({ status: "pending" });
    expect(text).toMatch(/status IN \('for_sale', 'sold'\)/);
  });

  it("filters by minYield as a decimal ratio param", () => {
    const { text, values } = buildListingsQuery({ minYield: 8 });
    expect(text).toMatch(/rent_zestimate \* 12\.0 \/ NULLIF\(price, 0\)\) >= \$\d/);
    expect(values).toContain(0.08);
  });

  it("grade A adds a lower bound only", () => {
    const { values } = buildListingsQuery({ grade: "A" });
    expect(values).toContain(0.1);
    expect(values).not.toContain(0.07);
  });

  it("grade B adds lower and upper bounds", () => {
    const { values } = buildListingsQuery({ grade: "B" });
    expect(values).toContain(0.07);
    expect(values).toContain(0.1);
  });

  it("SELECT exposes a computed deal_grade column", () => {
    const { text } = buildListingsQuery({});
    expect(text).toMatch(/AS deal_grade/);
  });
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd "/Users/abdulrehman/Desktop/Harrisburg/ISEM 564/propintel-feat" && npx vitest run lib/db/__tests__/listingsRepo.test.js`
Expected: FAIL — new assertions fail (no `baths >=`, no `deal_grade`, etc.).

- [ ] **Step 3: Implement.** In `lib/db/listingsRepo.js`:

(a) Remove `"status IN ('for_sale', 'sold')",` from the `where` array initializer so only the two price bounds remain:

```js
  const where = [`price >= ${PRICE_FLOOR}`, `price <= ${PRICE_CEILING}`];
```

(b) After the `if (f.maxPrice) ...` line, insert the new clause block (all values parameterized via `add`):

```js
  if (f.status && ["for_sale", "sold"].includes(f.status)) {
    add("status = $?", f.status);
  } else {
    where.push("status IN ('for_sale', 'sold')");
  }
  if (f.minBaths) add("baths >= $?", Number(f.minBaths));
  if (f.propertyType) add("property_type = $?", String(f.propertyType));
  if (f.minYield) {
    add("(rent_zestimate * 12.0 / NULLIF(price, 0)) >= $?", Number(f.minYield) / 100);
  }
  if (f.grade) {
    const GRADE_BANDS = { A: [0.1, null], B: [0.07, 0.1], C: [0.04, 0.07], D: [0, 0.04] };
    const band = GRADE_BANDS[String(f.grade).toUpperCase()];
    if (band) {
      const [lo, hi] = band;
      if (lo != null) add("(rent_zestimate * 12.0 / NULLIF(price, 0)) >= $?", lo);
      if (hi != null) add("(rent_zestimate * 12.0 / NULLIF(price, 0)) < $?", hi);
    }
  }
```

(c) Add the `deal_grade` expression to the SELECT column list in `buildListingsQuery` (append after `zpid`):

```js
  const text = `SELECT id, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date, photo_url, rent_zestimate, detail_url, zpid,
       CASE WHEN rent_zestimate IS NULL OR price = 0 THEN NULL
            WHEN rent_zestimate * 12.0 / price >= 0.10 THEN 'A'
            WHEN rent_zestimate * 12.0 / price >= 0.07 THEN 'B'
            WHEN rent_zestimate * 12.0 / price >= 0.04 THEN 'C'
            ELSE 'D' END AS deal_grade
     FROM listings
     WHERE ${where.join(" AND ")}
     ORDER BY (photo_url IS NULL), price ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
```

(d) Add the same `deal_grade` expression to the `getListingById` SELECT (append after `zpid` in that query string).

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run lib/db/__tests__/listingsRepo.test.js`
Expected: PASS (all old + new assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/db/listingsRepo.js lib/db/__tests__/listingsRepo.test.js
git commit -m "feat(search): add baths/type/status/yield/grade filters + deal_grade column"
```

---

## Task 2: Listings API route forwards new params

**Files:**
- Modify: `app/api/listings/route.js`
- Test: `app/api/listings/__tests__/route.test.js`

- [ ] **Step 1: Write failing test** — append inside `describe("GET /api/listings", ...)`:

```js
  it("forwards the new filters to findListings", async () => {
    findListings.mockResolvedValue([]);
    await GET(req("minBaths=2&propertyType=condo&status=for_sale&minYield=7&grade=B"));
    expect(findListings).toHaveBeenCalledWith(
      expect.objectContaining({
        minBaths: "2",
        propertyType: "condo",
        status: "for_sale",
        minYield: "7",
        grade: "B",
      }),
    );
  });
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run app/api/listings/__tests__/route.test.js`
Expected: FAIL — `findListings` called without the new keys.

- [ ] **Step 3: Implement.** In `app/api/listings/route.js`, add to the `filters` object (after `maxPrice`, before `page`):

```js
    minBaths: searchParams.get("minBaths") || undefined,
    propertyType: searchParams.get("propertyType") || undefined,
    status: searchParams.get("status") || undefined,
    minYield: searchParams.get("minYield") || undefined,
    grade: searchParams.get("grade") || undefined,
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run app/api/listings/__tests__/route.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/listings/route.js app/api/listings/__tests__/route.test.js
git commit -m "feat(api): forward baths/type/status/yield/grade params to listings repo"
```

---

## Task 3: SearchFilters UI controls

**Files:**
- Modify: `app/components/listings/SearchFilters.jsx`

(No new unit test file — these are presentational controls covered by the existing
pattern and exercised in Task 8 manual verify. Keep the change minimal.)

- [ ] **Step 1: Implement.** In `app/components/listings/SearchFilters.jsx`, after the Beds `<input>` (the last control before the closing `</div>`), add:

```jsx
      <input
        className={inputCls}
        type="number"
        placeholder="Baths"
        value={filters.minBaths || ""}
        onChange={set("minBaths")}
        aria-label="Minimum bathrooms"
      />
      <select
        className={inputCls}
        value={filters.propertyType || ""}
        onChange={set("propertyType")}
        aria-label="Property type"
      >
        <option value="">Any type</option>
        <option value="single_family">Single family</option>
        <option value="condo">Condo</option>
        <option value="townhouse">Townhouse</option>
        <option value="multi_family">Multi-family</option>
      </select>
      <select
        className={inputCls}
        value={filters.status || ""}
        onChange={set("status")}
        aria-label="Listing status"
      >
        <option value="">For sale &amp; sold</option>
        <option value="for_sale">For sale</option>
        <option value="sold">Sold</option>
      </select>
      <input
        className={inputCls}
        type="number"
        step="0.1"
        placeholder="Min yield %"
        value={filters.minYield || ""}
        onChange={set("minYield")}
        aria-label="Minimum gross yield percent"
      />
      <select
        className={inputCls}
        value={filters.grade || ""}
        onChange={set("grade")}
        aria-label="Screening grade"
      >
        <option value="">Any grade</option>
        <option value="A">A — yield ≥ 10%</option>
        <option value="B">B — 7–10%</option>
        <option value="C">C — 4–7%</option>
        <option value="D">D — &lt; 4%</option>
      </select>
```

- [ ] **Step 2: Verify it renders** (smoke via existing test run; no React error)

Run: `npx vitest run`
Expected: PASS (no test regressions).

- [ ] **Step 3: Commit**

```bash
git add app/components/listings/SearchFilters.jsx
git commit -m "feat(ui): add baths/type/status/yield/grade controls to SearchFilters"
```

---

## Task 4: search/page.jsx forwards new keys

**Files:**
- Modify: `app/search/page.jsx`

- [ ] **Step 1: Implement.** Replace the `toApiFilters` function (lines 8–21) with:

```jsx
// Map the free-text q field to zip (5 digits) or city for the API.
function toApiFilters({
  q,
  minPrice,
  maxPrice,
  beds,
  minBaths,
  propertyType,
  status,
  minYield,
  grade,
}) {
  const f = {};
  if (minPrice) f.minPrice = minPrice;
  if (maxPrice) f.maxPrice = maxPrice;
  if (beds) f.beds = beds;
  if (minBaths) f.minBaths = minBaths;
  if (propertyType) f.propertyType = propertyType;
  if (status) f.status = status;
  if (minYield) f.minYield = minYield;
  if (grade) f.grade = grade;
  const trimmed = (q || "").trim();
  if (/^\d{5}$/.test(trimmed)) {
    f.zip = trimmed;
  } else if (trimmed) {
    f.city = trimmed;
  }
  return f;
}
```

- [ ] **Step 2: Run full tests, verify no regression**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/search/page.jsx
git commit -m "feat(search): forward new filter keys through toApiFilters"
```

---

## Task 5: Shared NL filter schema + prompt

**Files:**
- Create: `lib/nl/filterSchema.js`

- [ ] **Step 1: Create `lib/nl/filterSchema.js`:**

```js
// lib/nl/filterSchema.js
import { z } from "zod";

// Validates model output. .strict() drops hallucinated keys; bounds clamp ranges.
export const NlFilterSchema = z
  .object({
    q: z.string().max(100).optional(),
    minPrice: z.coerce.number().int().min(0).max(50_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(50_000_000).optional(),
    beds: z.coerce.number().int().min(0).max(20).optional(),
    minBaths: z.coerce.number().min(0).max(20).optional(),
    propertyType: z
      .enum(["single_family", "condo", "townhouse", "multi_family"])
      .optional(),
    status: z.enum(["for_sale", "sold"]).optional(),
    minYield: z.coerce.number().min(0).max(100).optional(),
    grade: z.enum(["A", "B", "C", "D"]).optional(),
  })
  .strict();

export const NL_SYSTEM_PROMPT = `You convert a natural-language real-estate search into a JSON filter object.
Return ONLY raw JSON. Allowed keys (omit any the user did not mention):
  q            city name or 5-digit ZIP (string)
  minPrice     minimum price USD (integer)
  maxPrice     maximum price USD (integer)
  beds         minimum bedrooms (integer)
  minBaths     minimum bathrooms (number)
  propertyType one of: single_family, condo, townhouse, multi_family
  status       one of: for_sale, sold
  minYield     minimum gross rental yield percent (number)
  grade        screening grade one of: A, B, C, D
Rules: "under 300k" -> maxPrice 300000. "3 bed" -> beds 3. "good yield" -> grade A.
Never invent keys outside this list. Output JSON only, no prose, no markdown.`;

// JSON schema passed to Ollama's `format` to constrain output.
export const NL_OLLAMA_FORMAT = {
  type: "object",
  properties: {
    q: { type: "string" },
    minPrice: { type: "number" },
    maxPrice: { type: "number" },
    beds: { type: "number" },
    minBaths: { type: "number" },
    propertyType: {
      type: "string",
      enum: ["single_family", "condo", "townhouse", "multi_family"],
    },
    status: { type: "string", enum: ["for_sale", "sold"] },
    minYield: { type: "number" },
    grade: { type: "string", enum: ["A", "B", "C", "D"] },
  },
  required: [],
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/nl/filterSchema.js
git commit -m "feat(nl): shared Zod schema + system prompt for NL filter extraction"
```

---

## Task 6: /api/nl-filter route (Ollama + degradation)

**Files:**
- Create: `app/api/nl-filter/route.js`
- Test: `app/api/nl-filter/__tests__/route.test.js`

- [ ] **Step 1: Write failing tests** — create `app/api/nl-filter/__tests__/route.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route.js";

const post = (body) =>
  new Request("http://localhost/api/nl-filter", {
    method: "POST",
    body: JSON.stringify(body),
  });

const ollamaOk = (obj) => ({
  ok: true,
  json: async () => ({ message: { content: JSON.stringify(obj) } }),
});

describe("POST /api/nl-filter", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a validated filter object on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ollamaOk({ beds: 3, maxPrice: 300000, q: "Harrisburg" }),
      ),
    );
    const res = await POST(post({ query: "3 bed under 300k in Harrisburg" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ beds: 3, maxPrice: 300000, q: "Harrisburg" });
  });

  it("strips hallucinated keys via strict schema -> nl-unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ollamaOk({ beds: 2, listingType: "sale" })),
    );
    const res = await POST(post({ query: "2 bed for sale" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.error).toBe("nl-unavailable");
  });

  it("degrades when Ollama is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    const res = await POST(post({ query: "anything" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.error).toBe("nl-unavailable");
  });

  it("rejects an over-long query without calling Ollama", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const res = await POST(post({ query: "x".repeat(301) }));
    const body = await res.json();
    expect(body.error).toBe("invalid-query");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a missing query", async () => {
    const res = await POST(post({}));
    const body = await res.json();
    expect(body.error).toBe("invalid-query");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run app/api/nl-filter/__tests__/route.test.js`
Expected: FAIL — `../route.js` does not exist.

- [ ] **Step 3: Implement** — create `app/api/nl-filter/route.js`:

```js
import { NextResponse } from "next/server";
import {
  NlFilterSchema,
  NL_SYSTEM_PROMPT,
  NL_OLLAMA_FORMAT,
} from "../../../lib/nl/filterSchema.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const MAX_QUERY = 300;
const TIMEOUT_MS = 8000;

const unavailable = () => NextResponse.json({ error: "nl-unavailable" });

export async function POST(request) {
  let query;
  try {
    ({ query } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid-query" });
  }
  if (typeof query !== "string" || query.trim().length === 0 || query.length > MAX_QUERY) {
    return NextResponse.json({ error: "invalid-query" });
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: NL_OLLAMA_FORMAT,
        messages: [
          { role: "system", content: NL_SYSTEM_PROMPT },
          { role: "user", content: query.trim() },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return unavailable();
    const data = await res.json();
    const parsed = NlFilterSchema.parse(JSON.parse(data.message.content));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("nl-filter error:", err);
    return unavailable();
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run app/api/nl-filter/__tests__/route.test.js`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add app/api/nl-filter/route.js app/api/nl-filter/__tests__/route.test.js
git commit -m "feat(nl): /api/nl-filter route calling local Ollama with graceful degradation"
```

---

## Task 7: NLSearchBox component + wire into search page

**Files:**
- Create: `app/components/listings/NLSearchBox.jsx`
- Test: `app/components/listings/NLSearchBox.test.jsx`
- Modify: `app/search/page.jsx`

- [ ] **Step 1: Write failing tests** — create `app/components/listings/NLSearchBox.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NLSearchBox } from "./NLSearchBox";

describe("NLSearchBox", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("posts the query and applies the returned filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ beds: 3, q: "Harrisburg" }),
      }),
    );
    const onApply = vi.fn();
    render(<NLSearchBox onApply={onApply} />);
    fireEvent.change(screen.getByLabelText(/describe/i), {
      target: { value: "3 bed in Harrisburg" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ beds: 3, q: "Harrisburg" }),
      ),
    );
  });

  it("shows a fallback message and does not apply on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "nl-unavailable" }),
      }),
    );
    const onApply = vi.fn();
    render(<NLSearchBox onApply={onApply} />);
    fireEvent.change(screen.getByLabelText(/describe/i), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() =>
      expect(screen.getByText(/use the filters below/i)).toBeInTheDocument(),
    );
    expect(onApply).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run app/components/listings/NLSearchBox.test.jsx`
Expected: FAIL — `./NLSearchBox` does not exist.

- [ ] **Step 3: Implement** — create `app/components/listings/NLSearchBox.jsx`:

```jsx
"use client";
import { useState } from "react";

export function NLSearchBox({ onApply }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/nl-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(true);
      } else {
        onApply({ q: "", ...data });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 outline-none"
          placeholder="Describe what you want — e.g. '3 bed condo under 300k in Harrisburg for sale'"
          aria-label="Describe what you want"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          aria-disabled={loading}
          className="px-4 py-2.5 text-sm rounded-xl bg-forest-600 text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Search"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-ink-400">
          Could not parse that — use the filters below.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run app/components/listings/NLSearchBox.test.jsx`
Expected: PASS (2/2).

- [ ] **Step 5: Wire into the page.** In `app/search/page.jsx`, add the import after the `SearchFilters` import:

```jsx
import { NLSearchBox } from "../components/listings/NLSearchBox";
```

Then mount it directly above `<SearchFilters ... />` inside `<main>`:

```jsx
      <NLSearchBox onApply={setFilters} />
      <SearchFilters filters={filters} onChange={setFilters} />
```

- [ ] **Step 6: Run full suite, verify no regression**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/components/listings/NLSearchBox.jsx app/components/listings/NLSearchBox.test.jsx app/search/page.jsx
git commit -m "feat(nl): NLSearchBox wires natural-language query to setFilters"
```

---

## Task 8: Ollama config docs

**Files:**
- Modify: `.env.example`
- Create: `docs/OLLAMA_SETUP.md`

- [ ] **Step 1: Append to `.env.example`:**

```
# Local LLM for natural-language search (optional; page degrades gracefully if absent)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

- [ ] **Step 2: Create `docs/OLLAMA_SETUP.md`:**

```markdown
# Local LLM Setup (natural-language search)

The NL search box calls a local Qwen model via Ollama. It is optional — if Ollama
is not running, the box shows a fallback message and manual filters still work.

## Install + run (macOS, one time)

    brew install ollama
    ollama serve            # serves http://localhost:11434
    ollama pull qwen2.5:7b  # ~4.7 GB, best <12B for JSON extraction

If RAM is tight, set `OLLAMA_MODEL=qwen3:4b` in `.env` and `ollama pull qwen3:4b`.

## Verify

    curl http://localhost:11434/api/tags   # lists installed models

The model is offline, no API key. Latency ~1.5–4s warm on Apple Silicon.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/OLLAMA_SETUP.md
git commit -m "docs: document local Ollama/Qwen setup for NL search"
```

---

## Task 9: Manual verification on :3001

**Not a code task — run after Tasks 1–8 are green.**

- [ ] **Step 1:** `cd "/Users/abdulrehman/Desktop/Harrisburg/ISEM 564/propintel-feat"` then `cp "../Real estate project/.env" .env` (only if `.env` not already present), then `npm install`.
- [ ] **Step 2:** Start Ollama: `ollama serve` (separate terminal) + `ollama pull qwen2.5:7b`.
- [ ] **Step 3:** `npm run dev -- -p 3001`. Confirm `:3000` (prod) is still up and unchanged.
- [ ] **Step 4:** Open `http://localhost:3001/search`. Exercise each filter (baths, type, status, min yield, grade) and confirm result counts change sensibly.
- [ ] **Step 5:** Type "3 bed condo under 300k in Harrisburg for sale with good yield" in the NL box → confirm the filter inputs visibly populate (beds=3, type=condo, maxPrice, status=for_sale, grade A) and results refresh.
- [ ] **Step 6:** Stop Ollama (`Ctrl-C`), submit an NL query → confirm fallback message appears and manual filters still work.
- [ ] **Step 7:** Final full test + coverage: `npx vitest run --coverage`. Confirm new modules ≥80% and all green.

---

## Promote to prod (after Task 9 passes, on user's go-ahead)

```bash
cd "/Users/abdulrehman/Desktop/Harrisburg/ISEM 564/Real estate project"
git merge feat/search-filters-nl --no-ff -m "feat: search filters + local-LLM NL toggle"
npm run build
# restart the :3000 process
```

Rollback if needed: `git revert HEAD --no-edit && npm run build` then restart.
Cleanup: `git worktree remove ../propintel-feat && git branch -d feat/search-filters-nl`.

---

## Self-Review Notes

- **Spec coverage:** all 5 filters (T1–T4), deal_grade column (T1), NL route + schema + degradation (T5–T6), NLSearchBox toggle (T7), Ollama setup (T8), isolation + promote/rollback (T9 + promote section). Covered.
- **Type consistency:** filter keys `minBaths/propertyType/status/minYield/grade` identical across listingsRepo, route, SearchFilters, toApiFilters, NlFilterSchema, NL_OLLAMA_FORMAT. `deal_grade` SQL bands match `grade` filter bands (A≥0.10, B 0.07–0.10, C 0.04–0.07, D<0.04) and the `<select>` labels.
- **No placeholders:** every code step contains full code.
