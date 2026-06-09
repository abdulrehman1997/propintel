# Search Filters + Local-LLM Natural-Language Toggle — Design

**Date:** 2026-06-09
**Branch:** `feat/search-filters-nl` (built in worktree `../propintel-feat`)
**Status:** Approved — ready for implementation plan

## Goal

Add more search filters to the listings search page, and let a user describe what
they want in plain English to a **locally-hosted Qwen model** that fills in /
toggles those filters. All development and testing happens isolated from the
running production instance on `:3000`; prod changes only after a deliberate merge.

## Scope (YAGNI boundaries)

In scope:

- New filters: min baths, property_type, status, min yield %, deal grade (A–D).
- Natural-language → structured filter extraction via local Ollama + Qwen.
- Isolated dev workflow (git worktree + separate port + Ollama sidecar).

Out of scope (explicitly):

- No DB schema migration (all filters derive from existing columns).
- No change to the full deal-analysis grade on the property page — the search
  grade is a separate, lighter **screening grade**.
- No cloud LLM, no auth, no persistence of NL queries.

## Part 1 — New Filters

All filters derive from existing `listings` columns — **no migration**.

| Filter         | SQL mechanism                                                                          |
| -------------- | -------------------------------------------------------------------------------------- |
| min baths      | `baths >= $n`                                                                          |
| property_type  | `property_type = $n` — select: single_family / condo / townhouse / multi_family        |
| status         | `status = $n` — select: for_sale / sold; default keeps `status IN ('for_sale','sold')` |
| min yield %    | `(rent_zestimate * 12.0 / NULLIF(price,0)) >= n/100`                                   |
| deal grade A–D | gross-yield bands A≥0.10, B 0.07–0.10, C 0.04–0.07, D<0.04                             |

A computed `deal_grade` column is added to the SELECT so cards can show the band:

```
CASE WHEN rent_zestimate IS NULL OR price = 0 THEN NULL
     WHEN rent_zestimate*12.0/price >= 0.10 THEN 'A'
     WHEN rent_zestimate*12.0/price >= 0.07 THEN 'B'
     WHEN rent_zestimate*12.0/price >= 0.04 THEN 'C'
     ELSE 'D' END AS deal_grade
```

**Screening-grade caveat:** this gross-yield grade is intentionally lighter than
`lib/scoring.js` `compositeScore` (which needs full underwriting inputs). It is a
fast pre-filter, not the authoritative deal grade. UI copy must say "screening".

### Files changed

- `lib/db/listingsRepo.js` — extend `buildListingsQuery`: move `status` out of the
  static WHERE so it is overridable; add `minBaths`, `propertyType`, `minYield`,
  `grade` clauses; add `deal_grade` to both SELECTs. Keep parameterized `$n`
  binding for all value-bearing clauses (no string interpolation of user values —
  the yield/grade numeric bounds are derived from a fixed map, not raw input).
- `app/api/listings/route.js` — read `minBaths`, `propertyType`, `status`,
  `minYield`, `grade` from query params, pass to `findListings`.
- `app/components/listings/SearchFilters.jsx` — add the 5 controls (number inputs +
  selects), same `inputCls`, each with `aria-label`, bound to `filters.<key> || ""`.
- `app/search/page.jsx` — forward the 5 new keys through `toApiFilters`.
- `app/lib/useListings.js` — **no change** (already serializes any non-empty key).

## Part 2 — Local LLM Natural-Language Toggle

### Runtime + model

- **Ollama** on `localhost:11434` (Apple Metal, offline, no API key).
  Install: `brew install ollama` → `ollama serve` → `ollama pull qwen2.5:7b`.
- **Model `qwen2.5:7b`** (~4.7 GB) — best <12B for JSON extraction; supports
  grammar-constrained structured output. Env-overridable via `OLLAMA_MODEL`;
  fallback `qwen3:4b` if RAM-constrained.
- Latency ~1.5–4s warm on M-series for a short extraction prompt.

### API route — `app/api/nl-filter/route.js` (POST)

Input `{ query: string }`. Flow:

1. Validate: query is a non-empty string ≤ 300 chars, else `{ error: "invalid-query" }`.
2. Call Ollama `/api/chat` (`stream:false`, `format` = JSON schema below) with an
   8s `AbortSignal.timeout`.
3. Parse `data.message.content`, validate through Zod `.strict()`, clamp numerics.
4. Return the filter object. On ANY failure (network, timeout, bad JSON, Zod
   reject) return `{ error: "nl-unavailable" }` with **status 200** — never 500.

**Full filter Zod schema (all 9 keys — matches the extended filter state):**

```js
const NlFilterSchema = z
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
```

**System prompt** instructs the model: extract only the listed keys, omit
unmentioned keys, "under 300k" → maxPrice 300000, "3 bed" → beds 3, raw JSON only.

### UI — `app/components/listings/NLSearchBox.jsx`

- Placed above `<SearchFilters>` in `app/search/page.jsx`, receives `onApply={setFilters}`.
- Single-line input, placeholder "Describe what you want — e.g. '3 bed house under
  300k in Harrisburg for sale'", submit on button click or Enter.
- On success: `onApply({ ...result })` — visibly toggles the existing inputs and
  triggers the normal fetch.
- On `{ error }`: inline "Could not parse — use the filters below"; filter state untouched.
- Button shows loading state during the request.

### Security / validation

- 300-char cap enforced before any model call.
- Never trust model output: everything flows through `NlFilterSchema.parse()`.
- `.strict()` drops hallucinated keys; `.min()/.max()` clamp numerics.
- Model output never rendered as HTML.

## Part 3 — Prod-Isolated Dev Workflow

1. `git worktree add ../propintel-feat -b feat/search-filters-nl` — own
   `node_modules` + `.next`, zero collision with master.
2. In the worktree: `npm install`, copy `.env`, `npm run dev -- -p 3001`.
3. Prod stays on master at `:3000`, untouched. **Shared DB is read-only** from the
   app layer (SELECT only) — safe. Never run `updater/` from the worktree.
4. Ollama sidecar on `:11434` is a standalone OS process, shared harmlessly.
5. **Promote:** when unit tests pass + manual verify on `:3001` is good →
   `git merge feat/search-filters-nl` into master → rebuild → restart `:3000`.
6. **Rollback:** `git revert HEAD` (or `git reset --hard HEAD~1`) → rebuild → restart.
7. Cleanup: `git worktree remove ../propintel-feat` + delete branch.

## Testing (TDD)

Unit (`vitest`):

- `lib/db/__tests__/listingsRepo.test.js`: minBaths clause; propertyType clause;
  status override vs default-IN; minYield expression; grade A (lower bound only);
  grade B (lower+upper); SELECT contains `deal_grade`.
- `app/api/listings/__tests__/route.test.js`: new params forwarded to `findListings`.
- `app/api/nl-filter/__tests__/route.test.js` (mock fetch to Ollama): happy path
  validated; Ollama down → `{error}` 200; timeout → `{error}`; hallucinated key
  stripped/rejected; query > 300 chars → `{error:"invalid-query"}` without calling Ollama.
- `app/components/listings/NLSearchBox.test.jsx`: POSTs `{query}`; calls `setFilters`
  on success; shows fallback + does not call `setFilters` on `{error}`; button
  disabled while loading.

Manual verify on `:3001`:

- All new filters return sensible results against live DB.
- NL box: "3 bed condo under 300k in Harrisburg for sale with good yield" toggles
  the right inputs and runs the search.
- Stop Ollama → NL box degrades gracefully, manual filters still work.

## Success criteria

- All 5 new filters work via the UI and via direct query params.
- Deal-grade screening filter labeled clearly as screening.
- NL box fills filters from plain English with a local <12B Qwen, fully offline.
- Ollama unavailable never breaks the page.
- `:3000` prod unchanged until deliberate merge; full rollback path exists.
- All unit tests green; ≥80% coverage on new modules.
