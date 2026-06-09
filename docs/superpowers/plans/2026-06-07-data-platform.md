# Data Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a real local data platform — Postgres 16 in Docker, fed by a standalone Node updater that pulls free public data (Census ACS, HUD FMR, FRED, BLS, Zillow research CSVs) on a cron schedule with idempotent upserts — and rewire `app/api/neighborhood/route.js` to read Postgres first (live API only on miss). This eliminates the current 500-on-missing-keys failure because seeded data is always present, and surfaces a stale-data timestamp to the UI.

**Architecture:** `updater/` is a standalone Node service with its own `package.json`, **not part of the Next build**. It owns the schema (`updater/schema.sql`), per-source pull modules, a shared `pg` Pool (`updater/db.js`), upsert repositories, a `node-cron` scheduler (`updater/index.js`), and a one-shot seeder (`updater/seed.js`). Each source runs inside its own try/catch and writes a `refresh_log` row, so one failing source never aborts the run. The Next API layer reads the same Postgres via its own pooled client (`lib/db/pool.js` — new, does not touch existing `lib/` calc modules) and falls back to the existing live-API path on a cache miss.

**Tech Stack:** Postgres 16 (Docker, named volume, healthcheck), Node 20 + `pg` (Pool), `node-cron`, `csv-parse` (Zillow CSV), `vitest` for integration tests, `pg-mem` for fast in-memory schema/upsert tests **plus** a real throwaway Postgres (via `docker-compose`) for the end-to-end API read-path test. Decision: **pg-mem for upsert-idempotency unit-level integration tests** (fast, no Docker required in CI), **real Dockerized Postgres for the `/api/neighborhood` read-path integration test** (exercises the actual `pg` driver + SQL). Both are explicit in the tasks below.

---

## File Structure

| File                                              | Responsibility                                                                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`                              | Defines the `db` service: `postgres:16-alpine`, named volume `propintel_pgdata`, `pg_isready` healthcheck, port `5432:5432`, env from `.env`.                                                                         |
| `updater/package.json`                            | Standalone service manifest. Scripts: `seed`, `start` (cron), `test`. Deps: `pg`, `node-cron`, `csv-parse`, `dotenv`. DevDeps: `vitest`, `pg-mem`. `"type": "module"`.                                                |
| `updater/schema.sql`                              | Full DDL for `markets`, `rent_benchmarks`, `economic_indicators`, `refresh_log`. Idempotent (`CREATE TABLE IF NOT EXISTS`).                                                                                           |
| `updater/db.js`                                   | Exports a shared `pg` `Pool` built from `DATABASE_URL`, plus `query(text, params)` helper and `runSchema()` that executes `schema.sql`.                                                                               |
| `updater/repositories.js`                         | Idempotent upsert functions: `upsertMarket`, `upsertRentBenchmark`, `upsertEconomicIndicator`, `startRefresh`, `finishRefresh`. All use `ON CONFLICT ... DO UPDATE`.                                                  |
| `updater/sources/census.js`                       | `pullCensus(client, zip)` → ACS5 demographics → `economic_indicators` + `markets`.                                                                                                                                    |
| `updater/sources/hud.js`                          | `pullHud(client, stateCode, zip)` → FMR by bedroom → `rent_benchmarks`.                                                                                                                                               |
| `updater/sources/fred.js`                         | `pullFred(client, seriesId)` → latest FRED observation → `economic_indicators`.                                                                                                                                       |
| `updater/sources/bls.js`                          | `pullBls(client, seriesId, geo)` → latest BLS series value → `economic_indicators`.                                                                                                                                   |
| `updater/sources/zillow.js`                       | `pullZillow(client)` → download Zillow ZHVI research CSV, parse, upsert `economic_indicators`.                                                                                                                        |
| `updater/run.js`                                  | `runAllSources(zips)` — orchestrates all sources, per-source try/catch, writes `refresh_log`.                                                                                                                         |
| `updater/seed.js`                                 | One-shot: `runSchema()` then `runAllSources(SEED_ZIPS)`, then `pool.end()`. Invoked by `npm run seed`.                                                                                                                |
| `updater/index.js`                                | `node-cron` scheduler (default `CRON_SCHEDULE` daily `0 3 * * *`) calling `runAllSources`. Long-running; `npm start`.                                                                                                 |
| `updater/.env.example`                            | Documents env vars (see below).                                                                                                                                                                                       |
| `lib/db/pool.js`                                  | **New** Next-side pooled `pg` client (`getPool()`, `query()`). Separate from updater pool; does NOT import or modify existing calc modules in `lib/`.                                                                 |
| `lib/db/neighborhoodRepo.js`                      | **New** `getNeighborhoodFromDb(zip)` — reads `markets` + `economic_indicators` + `rent_benchmarks`, assembles a result shaped like the existing live response, includes `dataAsOf` timestamp. Returns `null` on miss. |
| `app/api/neighborhood/route.js`                   | **Rewired** — Postgres-first via `getNeighborhoodFromDb`, fall back to existing live-API logic on `null`. Adds `dataAsOf` / `source` to the response.                                                                 |
| `updater/test/upsert.test.js`                     | Vitest + pg-mem: upsert idempotency for all four tables.                                                                                                                                                              |
| `updater/test/parse.test.js`                      | Vitest: pure parse helpers (Census row → indicators, Zillow CSV row → indicator).                                                                                                                                     |
| `app/api/neighborhood/__tests__/readpath.test.js` | Vitest against real Dockerized throwaway Postgres: seed rows → `getNeighborhoodFromDb` returns assembled result with `dataAsOf`.                                                                                      |

### Environment Variables (exact names)

```
DATABASE_URL=postgres://propintel:propintel@localhost:5432/propintel
POSTGRES_USER=propintel
POSTGRES_PASSWORD=propintel
POSTGRES_DB=propintel
CRON_SCHEDULE=0 3 * * *
SEED_ZIPS=17101,17102,19103,15213
CENSUS_API_KEY=
HUD_API_TOKEN=
FRED_API_KEY=
BLS_API_KEY=
ZILLOW_ZHVI_CSV_URL=https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv
```

### Full SQL Schema (`updater/schema.sql`)

```sql
-- Idempotent schema for PropIntel data platform.

CREATE TABLE IF NOT EXISTS markets (
  zip           TEXT PRIMARY KEY,          -- 5-digit ZCTA, e.g. '17101'
  city          TEXT,
  state         TEXT,                       -- full name, e.g. 'Pennsylvania'
  state_code    TEXT,                       -- 2-letter, e.g. 'PA'
  county_fips   TEXT,                       -- 5-digit FIPS, e.g. '42043'
  lat           DOUBLE PRECISION,
  lon           DOUBLE PRECISION,
  last_refreshed TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rent_benchmarks (
  zip        TEXT NOT NULL,                 -- FK-ish to markets.zip (no hard FK; sources may lead)
  bedroom    SMALLINT NOT NULL,             -- 0=studio,1,2,3,4
  fmr        INTEGER,                       -- monthly Fair Market Rent in whole USD
  source     TEXT NOT NULL,                 -- 'HUD_FMR'
  period     TEXT NOT NULL,                 -- fiscal year as text, e.g. '2025'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (zip, bedroom, source, period)
);

CREATE TABLE IF NOT EXISTS economic_indicators (
  geo        TEXT NOT NULL,                 -- zip ('17101') or FRED/BLS geo label ('US','PA')
  metric     TEXT NOT NULL,                 -- 'median_income','median_rent','median_home_value',
                                            -- 'population','vacancy_rate','unemployment_rate',
                                            -- 'renter_units','occupied_units','vacant_units',
                                            -- 'total_units','zhvi','fred_mortgage_30y',
                                            -- 'bls_unemployment'
  value      DOUBLE PRECISION,
  source     TEXT NOT NULL,                 -- 'CENSUS_ACS5','FRED','BLS','ZILLOW_ZHVI'
  period     DATE NOT NULL,                 -- observation date; ACS uses Dec 31 of vintage (2022-12-31)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (geo, metric, source, period)
);

CREATE TABLE IF NOT EXISTS refresh_log (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,                -- 'CENSUS_ACS5','HUD_FMR','FRED','BLS','ZILLOW_ZHVI'
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'running', -- 'running','success','error'
  rows        INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS idx_econ_geo_metric ON economic_indicators (geo, metric);
CREATE INDEX IF NOT EXISTS idx_rent_zip ON rent_benchmarks (zip);
CREATE INDEX IF NOT EXISTS idx_refresh_source_started ON refresh_log (source, started_at DESC);
```

---

## Tasks

### Task 1 — Docker Postgres + named volume + healthcheck

**Files:** `docker-compose.yml`, `updater/.env.example`

- [ ] Write `updater/.env.example` with the exact env vars listed above.
- [ ] Write `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: propintel_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-propintel}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-propintel}
      POSTGRES_DB: ${POSTGRES_DB:-propintel}
    ports:
      - "5432:5432"
    volumes:
      - propintel_pgdata:/var/lib/postgresql/data
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-propintel} -d ${POSTGRES_DB:-propintel}",
        ]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  propintel_pgdata:
```

- [ ] Run to verify: `docker compose up -d db && sleep 6 && docker inspect --format '{{.State.Health.Status}}' propintel_db` — expect `healthy`.
- [ ] Run to verify connectivity: `docker exec propintel_db psql -U propintel -d propintel -c '\dt'` — expect `Did not find any relations.` (schema not yet loaded).
- [ ] Commit: `chore: add Postgres 16 docker-compose with healthcheck and named volume`.

### Task 2 — Updater package scaffold + shared pool + schema loader

**Files:** `updater/package.json`, `updater/db.js`, `updater/schema.sql`

- [ ] Write `updater/schema.sql` exactly as in the File Structure section above.
- [ ] Write `updater/package.json`:

```json
{
  "name": "propintel-updater",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "node seed.js",
    "start": "node index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "csv-parse": "^5.5.6",
    "dotenv": "^16.4.5",
    "node-cron": "^3.0.3",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "pg-mem": "^3.0.3",
    "vitest": "^2.1.0"
  }
}
```

- [ ] Write `updater/db.js`:

```js
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://propintel:propintel@localhost:5432/propintel",
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function runSchema(client = pool) {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await client.query(sql);
}
```

- [ ] Run to verify: `cd updater && npm install && node -e "import('./db.js').then(m=>m.runSchema().then(()=>{console.log('schema-ok');return m.pool.end()}))"` — expect `schema-ok`.
- [ ] Run to verify tables: `docker exec propintel_db psql -U propintel -d propintel -c '\dt'` — expect `markets`, `rent_benchmarks`, `economic_indicators`, `refresh_log`.
- [ ] Commit: `feat(updater): scaffold standalone service with pg pool and schema loader`.

### Task 3 — Idempotent upsert repositories (pg-mem integration test first)

**Files:** `updater/test/upsert.test.js`, `updater/repositories.js`

- [ ] Write failing test `updater/test/upsert.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import { newDb } from "pg-mem";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  upsertMarket,
  upsertRentBenchmark,
  upsertEconomicIndicator,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeDb() {
  const db = newDb();
  db.public.none(readFileSync(join(__dirname, "../schema.sql"), "utf8"));
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe("idempotent upserts", () => {
  let client;
  beforeEach(() => {
    client = makeDb();
  });

  it("upsertMarket inserts then updates without duplicating", async () => {
    await upsertMarket(client, {
      zip: "17101",
      city: "Harrisburg",
      state: "Pennsylvania",
      stateCode: "PA",
      countyFips: "42043",
      lat: 40.26,
      lon: -76.88,
    });
    await upsertMarket(client, {
      zip: "17101",
      city: "Harrisburg City",
      state: "Pennsylvania",
      stateCode: "PA",
      countyFips: "42043",
      lat: 40.26,
      lon: -76.88,
    });
    const { rows } = await client.query("SELECT zip, city FROM markets");
    expect(rows).toHaveLength(1);
    expect(rows[0].city).toBe("Harrisburg City");
  });

  it("upsertRentBenchmark is keyed by (zip,bedroom,source,period)", async () => {
    const base = {
      zip: "17101",
      bedroom: 2,
      source: "HUD_FMR",
      period: "2025",
    };
    await upsertRentBenchmark(client, { ...base, fmr: 1100 });
    await upsertRentBenchmark(client, { ...base, fmr: 1250 });
    const { rows } = await client.query("SELECT fmr FROM rent_benchmarks");
    expect(rows).toHaveLength(1);
    expect(rows[0].fmr).toBe(1250);
  });

  it("upsertEconomicIndicator is keyed by (geo,metric,source,period)", async () => {
    const base = {
      geo: "17101",
      metric: "median_income",
      source: "CENSUS_ACS5",
      period: "2022-12-31",
    };
    await upsertEconomicIndicator(client, { ...base, value: 55000 });
    await upsertEconomicIndicator(client, { ...base, value: 56000 });
    const { rows } = await client.query(
      "SELECT value FROM economic_indicators",
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].value)).toBe(56000);
  });

  it("startRefresh + finishRefresh write one row with final status", async () => {
    const id = await startRefresh(client, "CENSUS_ACS5");
    await finishRefresh(client, id, { status: "success", rows: 7 });
    const { rows } = await client.query(
      "SELECT status, rows FROM refresh_log WHERE id=$1",
      [id],
    );
    expect(rows[0].status).toBe("success");
    expect(rows[0].rows).toBe(7);
  });
});
```

- [ ] Run to fail: `cd updater && npm test` — expect `Cannot find module '../repositories.js'` (or import error).
- [ ] Write minimal `updater/repositories.js`:

```js
export async function upsertMarket(client, m) {
  await client.query(
    `INSERT INTO markets (zip, city, state, state_code, county_fips, lat, lon, last_refreshed)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now())
     ON CONFLICT (zip) DO UPDATE SET
       city=EXCLUDED.city, state=EXCLUDED.state, state_code=EXCLUDED.state_code,
       county_fips=EXCLUDED.county_fips, lat=EXCLUDED.lat, lon=EXCLUDED.lon,
       last_refreshed=now()`,
    [m.zip, m.city, m.state, m.stateCode, m.countyFips, m.lat, m.lon],
  );
}

export async function upsertRentBenchmark(client, r) {
  await client.query(
    `INSERT INTO rent_benchmarks (zip, bedroom, fmr, source, period, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (zip, bedroom, source, period) DO UPDATE SET
       fmr=EXCLUDED.fmr, updated_at=now()`,
    [r.zip, r.bedroom, r.fmr, r.source, r.period],
  );
}

export async function upsertEconomicIndicator(client, e) {
  await client.query(
    `INSERT INTO economic_indicators (geo, metric, value, source, period, updated_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (geo, metric, source, period) DO UPDATE SET
       value=EXCLUDED.value, updated_at=now()`,
    [e.geo, e.metric, e.value, e.source, e.period],
  );
}

export async function startRefresh(client, source) {
  const { rows } = await client.query(
    `INSERT INTO refresh_log (source, status) VALUES ($1, 'running') RETURNING id`,
    [source],
  );
  return rows[0].id;
}

export async function finishRefresh(
  client,
  id,
  { status, rows = 0, error = null },
) {
  await client.query(
    `UPDATE refresh_log SET finished_at=now(), status=$2, rows=$3, error=$4 WHERE id=$1`,
    [id, status, rows, error],
  );
}
```

- [ ] Run to pass: `cd updater && npm test` — expect all 4 tests passing.
- [ ] Commit: `feat(updater): idempotent upsert repositories with refresh_log (pg-mem tested)`.

### Task 4 — Census source: pure parse helper + pull

**Files:** `updater/test/parse.test.js`, `updater/sources/census.js`

- [ ] Write failing test in `updater/test/parse.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseCensusRow } from "../sources/census.js";

describe("parseCensusRow", () => {
  it("maps ACS5 row to indicator records, dropping negative sentinels", () => {
    // header order matches the GET= request in census.js
    const row = [
      "Harrisburg",
      "55000",
      "1100",
      "180000",
      "49000",
      "8000",
      "12000",
      "900",
      "12900",
      "600",
      "24000",
      "17101",
    ];
    const out = parseCensusRow("17101", row);
    const byMetric = Object.fromEntries(out.map((r) => [r.metric, r.value]));
    expect(byMetric.median_income).toBe(55000);
    expect(byMetric.median_rent).toBe(1100);
    expect(byMetric.median_home_value).toBe(180000);
    expect(byMetric.population).toBe(49000);
    expect(
      out.every((r) => r.source === "CENSUS_ACS5" && r.period === "2022-12-31"),
    ).toBe(true);
  });

  it("drops negative Census sentinel values (e.g. -666666666)", () => {
    const row = [
      "X",
      "-666666666",
      "1100",
      "180000",
      "49000",
      "8000",
      "12000",
      "900",
      "12900",
      "600",
      "24000",
      "17101",
    ];
    const out = parseCensusRow("17101", row);
    expect(out.find((r) => r.metric === "median_income")).toBeUndefined();
  });
});
```

- [ ] Run to fail: `cd updater && npm test parse` — expect `parseCensusRow is not a function`.
- [ ] Write `updater/sources/census.js`:

```js
import {
  upsertEconomicIndicator,
  upsertMarket,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const ACS_PERIOD = "2022-12-31";
// Column order MUST match the GET= list below (index 0 = NAME).
const ACS_VARS = [
  ["B19013_001E", "median_income"],
  ["B25064_001E", "median_rent"],
  ["B25077_001E", "median_home_value"],
  ["B01003_001E", "population"],
  ["B25003_003E", "renter_units"],
  ["B25002_002E", "occupied_units"],
  ["B25002_003E", "vacant_units"],
  ["B25002_001E", "total_units"],
  ["B23025_005E", "unemployed"],
  ["B23025_003E", "labor_force"],
];

export function parseCensusRow(zip, row) {
  const out = [];
  ACS_VARS.forEach(([, metric], i) => {
    const raw = Number(row[i + 1]); // +1 to skip NAME
    if (Number.isFinite(raw) && raw >= 0) {
      out.push({
        geo: zip,
        metric,
        value: raw,
        source: "CENSUS_ACS5",
        period: ACS_PERIOD,
      });
    }
  });
  return out;
}

export async function pullCensus(client, zip) {
  const id = await startRefresh(client, "CENSUS_ACS5");
  try {
    const get = ["NAME", ...ACS_VARS.map(([code]) => code)].join(",");
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${get}&for=zip%20code%20tabulation%20area:${zip}&key=${process.env.CENSUS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Census HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length < 2)
      throw new Error("Census: no data");
    const records = parseCensusRow(zip, rows[1]);
    await upsertMarket(client, {
      zip,
      city: rows[1][0],
      state: null,
      stateCode: null,
      countyFips: null,
      lat: null,
      lon: null,
    });
    for (const r of records) await upsertEconomicIndicator(client, r);
    await finishRefresh(client, id, {
      status: "success",
      rows: records.length,
    });
    return records.length;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
```

- [ ] Run to pass: `cd updater && npm test parse` — expect both Census parse tests passing.
- [ ] Commit: `feat(updater): Census ACS5 source with pure parse helper`.

### Task 5 — HUD FMR source

**Files:** `updater/sources/hud.js`, append to `updater/test/parse.test.js`

- [ ] Append failing test to `updater/test/parse.test.js`:

```js
import { parseHudBasicData } from "../sources/hud.js";

describe("parseHudBasicData", () => {
  it("extracts FMR by bedroom for the target zip when SAFMR present", () => {
    const basicdata = [
      {
        zip_code: "17101",
        Efficiency: 800,
        "One-Bedroom": 900,
        "Two-Bedroom": 1100,
        "Three-Bedroom": 1400,
        "Four-Bedroom": 1700,
      },
      {
        zip_code: "MSA level",
        Efficiency: 700,
        "One-Bedroom": 850,
        "Two-Bedroom": 1000,
        "Three-Bedroom": 1300,
        "Four-Bedroom": 1600,
      },
    ];
    const out = parseHudBasicData("17101", basicdata, "2025");
    const byBed = Object.fromEntries(out.map((r) => [r.bedroom, r.fmr]));
    expect(byBed[0]).toBe(800);
    expect(byBed[2]).toBe(1100);
    expect(byBed[4]).toBe(1700);
    expect(
      out.every(
        (r) =>
          r.source === "HUD_FMR" && r.period === "2025" && r.zip === "17101",
      ),
    ).toBe(true);
  });

  it("falls back to MSA-level row when zip not in SAFMR list", () => {
    const basicdata = [
      {
        zip_code: "MSA level",
        Efficiency: 700,
        "One-Bedroom": 850,
        "Two-Bedroom": 1000,
        "Three-Bedroom": 1300,
        "Four-Bedroom": 1600,
      },
    ];
    const out = parseHudBasicData("99999", basicdata, "2025");
    expect(Object.fromEntries(out.map((r) => [r.bedroom, r.fmr]))[1]).toBe(850);
  });
});
```

- [ ] Run to fail: `cd updater && npm test parse` — expect `parseHudBasicData is not a function`.
- [ ] Write `updater/sources/hud.js`:

```js
import {
  upsertRentBenchmark,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const BEDROOM_FIELDS = [
  [0, "Efficiency"],
  [1, "One-Bedroom"],
  [2, "Two-Bedroom"],
  [3, "Three-Bedroom"],
  [4, "Four-Bedroom"],
];

export function parseHudBasicData(zip, basicdata, period) {
  const zipRow = basicdata.find((r) => r.zip_code === zip);
  const msaRow = basicdata.find((r) => r.zip_code === "MSA level");
  const src = zipRow || msaRow;
  if (!src) return [];
  return BEDROOM_FIELDS.map(([bedroom, field]) => ({
    zip,
    bedroom,
    fmr: src[field] == null ? null : Number(src[field]),
    source: "HUD_FMR",
    period,
  }));
}

export async function pullHud(client, countyFips, zip, year = "2025") {
  const id = await startRefresh(client, "HUD_FMR");
  try {
    const res = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/data/${countyFips}?year=${year}`,
      {
        headers: { Authorization: `Bearer ${process.env.HUD_API_TOKEN}` },
      },
    );
    if (!res.ok) throw new Error(`HUD HTTP ${res.status}`);
    const json = await res.json();
    const basicdata = json?.data?.basicdata;
    if (!basicdata) throw new Error("HUD: no basicdata");
    const records = parseHudBasicData(zip, basicdata, year);
    for (const r of records) await upsertRentBenchmark(client, r);
    await finishRefresh(client, id, {
      status: "success",
      rows: records.length,
    });
    return records.length;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
```

- [ ] Run to pass: `cd updater && npm test parse` — expect the two HUD tests passing.
- [ ] Commit: `feat(updater): HUD FMR source with bedroom parse + MSA fallback`.

### Task 6 — FRED + BLS sources

**Files:** `updater/sources/fred.js`, `updater/sources/bls.js`, append to `updater/test/parse.test.js`

- [ ] Append failing tests to `updater/test/parse.test.js`:

```js
import { parseFredLatest } from "../sources/fred.js";
import { parseBlsLatest } from "../sources/bls.js";

describe("parseFredLatest", () => {
  it('returns latest non-"." observation as indicator', () => {
    const payload = {
      observations: [
        { date: "2025-01-01", value: "6.95" },
        { date: "2025-02-01", value: "." },
        { date: "2025-03-01", value: "6.80" },
      ],
    };
    const rec = parseFredLatest("MORTGAGE30US", payload);
    expect(rec).toEqual({
      geo: "US",
      metric: "fred_mortgage_30y",
      value: 6.8,
      source: "FRED",
      period: "2025-03-01",
    });
  });
});

describe("parseBlsLatest", () => {
  it("returns latest BLS series value as indicator", () => {
    const payload = {
      Results: {
        series: [
          {
            seriesID: "LNS14000000",
            data: [
              {
                year: "2025",
                period: "M03",
                periodName: "March",
                value: "4.1",
              },
              {
                year: "2025",
                period: "M02",
                periodName: "February",
                value: "4.0",
              },
            ],
          },
        ],
      },
    };
    const rec = parseBlsLatest("LNS14000000", "US", payload);
    expect(rec.metric).toBe("bls_unemployment");
    expect(rec.value).toBe(4.1);
    expect(rec.period).toBe("2025-03-01");
    expect(rec.source).toBe("BLS");
  });
});
```

- [ ] Run to fail: `cd updater && npm test parse` — expect `parseFredLatest is not a function`.
- [ ] Write `updater/sources/fred.js`:

```js
import {
  upsertEconomicIndicator,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const SERIES_METRIC = { MORTGAGE30US: "fred_mortgage_30y" };

export function parseFredLatest(seriesId, payload) {
  const obs = (payload?.observations || []).filter((o) => o.value !== ".");
  if (obs.length === 0) return null;
  const latest = obs[obs.length - 1];
  return {
    geo: "US",
    metric: SERIES_METRIC[seriesId] || seriesId.toLowerCase(),
    value: Number(latest.value),
    source: "FRED",
    period: latest.date, // YYYY-MM-DD
  };
}

export async function pullFred(client, seriesId = "MORTGAGE30US") {
  const id = await startRefresh(client, "FRED");
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&file_type=json&sort_order=asc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
    const rec = parseFredLatest(seriesId, await res.json());
    if (!rec) throw new Error("FRED: no observations");
    await upsertEconomicIndicator(client, rec);
    await finishRefresh(client, id, { status: "success", rows: 1 });
    return 1;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
```

- [ ] Write `updater/sources/bls.js`:

```js
import {
  upsertEconomicIndicator,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const SERIES_METRIC = { LNS14000000: "bls_unemployment" };

export function parseBlsLatest(seriesId, geo, payload) {
  const series = payload?.Results?.series?.[0];
  const data = series?.data || [];
  if (data.length === 0) return null;
  const latest = data[0]; // BLS returns newest-first
  const month = String(latest.period).replace("M", "").padStart(2, "0");
  return {
    geo,
    metric: SERIES_METRIC[seriesId] || seriesId.toLowerCase(),
    value: Number(latest.value),
    source: "BLS",
    period: `${latest.year}-${month}-01`,
  };
}

export async function pullBls(client, seriesId = "LNS14000000", geo = "US") {
  const id = await startRefresh(client, "BLS");
  try {
    const res = await fetch(
      "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesid: [seriesId],
          registrationkey: process.env.BLS_API_KEY,
        }),
      },
    );
    if (!res.ok) throw new Error(`BLS HTTP ${res.status}`);
    const rec = parseBlsLatest(seriesId, geo, await res.json());
    if (!rec) throw new Error("BLS: no data");
    await upsertEconomicIndicator(client, rec);
    await finishRefresh(client, id, { status: "success", rows: 1 });
    return 1;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
```

- [ ] Run to pass: `cd updater && npm test parse` — expect FRED + BLS tests passing.
- [ ] Commit: `feat(updater): FRED 30y mortgage + BLS unemployment sources`.

### Task 7 — Zillow ZHVI CSV download + parse

**Files:** `updater/sources/zillow.js`, append to `updater/test/parse.test.js`

- [ ] Append failing test to `updater/test/parse.test.js`:

```js
import { parseZillowCsv } from "../sources/zillow.js";

describe("parseZillowCsv", () => {
  it("extracts the latest month ZHVI for requested zips", () => {
    const csv = [
      "RegionID,SizeRank,RegionName,RegionType,StateName,2025-01-31,2025-02-28",
      "61639,1,17101,zip,PA,150000,152500",
      "61640,2,19103,zip,PA,420000,425000",
    ].join("\n");
    const out = parseZillowCsv(csv, ["17101"]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      geo: "17101",
      metric: "zhvi",
      value: 152500,
      source: "ZILLOW_ZHVI",
      period: "2025-02-28",
    });
  });
});
```

- [ ] Run to fail: `cd updater && npm test parse` — expect `parseZillowCsv is not a function`.
- [ ] Write `updater/sources/zillow.js`:

```js
import { parse } from "csv-parse/sync";
import {
  upsertEconomicIndicator,
  startRefresh,
  finishRefresh,
} from "../repositories.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseZillowCsv(csvText, zips) {
  const records = parse(csvText, { columns: true, skip_empty_lines: true });
  if (records.length === 0) return [];
  const dateCols = Object.keys(records[0]).filter((c) => DATE_RE.test(c));
  const latest = dateCols[dateCols.length - 1];
  const wanted = new Set(zips);
  const out = [];
  for (const row of records) {
    if (!wanted.has(row.RegionName)) continue;
    const v = row[latest];
    if (v === "" || v == null) continue;
    out.push({
      geo: row.RegionName,
      metric: "zhvi",
      value: Number(v),
      source: "ZILLOW_ZHVI",
      period: latest,
    });
  }
  return out;
}

export async function pullZillow(client, zips) {
  const id = await startRefresh(client, "ZILLOW_ZHVI");
  try {
    const url =
      process.env.ZILLOW_ZHVI_CSV_URL ||
      "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Zillow HTTP ${res.status}`);
    const records = parseZillowCsv(await res.text(), zips);
    for (const r of records) await upsertEconomicIndicator(client, r);
    await finishRefresh(client, id, {
      status: "success",
      rows: records.length,
    });
    return records.length;
  } catch (err) {
    await finishRefresh(client, id, {
      status: "error",
      error: String(err.message || err),
    });
    throw err;
  }
}
```

- [ ] Run to pass: `cd updater && npm test parse` — expect Zillow test passing.
- [ ] Commit: `feat(updater): Zillow ZHVI CSV download + parse for requested zips`.

### Task 8 — Orchestrator with per-source isolation

**Files:** `updater/run.js`, `updater/test/run.test.js`

- [ ] Write failing test `updater/test/run.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { newDb } from "pg-mem";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runAllSources } from "../run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeDb() {
  const db = newDb();
  db.public.none(readFileSync(join(__dirname, "../schema.sql"), "utf8"));
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe("runAllSources isolation", () => {
  it("one failing source does not abort the run; both log to refresh_log", async () => {
    const client = makeDb();
    const ok = vi.fn().mockResolvedValue(3);
    const bad = vi.fn().mockRejectedValue(new Error("boom"));
    const summary = await runAllSources({
      client,
      zips: ["17101"],
      tasks: [
        { source: "CENSUS_ACS5", run: ok },
        { source: "FRED", run: bad },
      ],
    });
    expect(ok).toHaveBeenCalledOnce();
    expect(bad).toHaveBeenCalledOnce();
    expect(summary.find((s) => s.source === "CENSUS_ACS5").status).toBe(
      "success",
    );
    expect(summary.find((s) => s.source === "FRED").status).toBe("error");
  });
});
```

- [ ] Run to fail: `cd updater && npm test run` — expect `runAllSources is not a function`.
- [ ] Write `updater/run.js`:

```js
import { pool } from "./db.js";
import { pullCensus } from "./sources/census.js";
import { pullHud } from "./sources/hud.js";
import { pullFred } from "./sources/fred.js";
import { pullBls } from "./sources/bls.js";
import { pullZillow } from "./sources/zillow.js";

export function defaultTasks(zips) {
  return [
    {
      source: "CENSUS_ACS5",
      run: async (c) => {
        let n = 0;
        for (const z of zips) n += await pullCensus(c, z);
        return n;
      },
    },
    { source: "FRED", run: (c) => pullFred(c) },
    { source: "BLS", run: (c) => pullBls(c) },
    { source: "ZILLOW_ZHVI", run: (c) => pullZillow(c, zips) },
  ];
}

export async function runAllSources({ client = pool, zips, tasks } = {}) {
  const list = tasks || defaultTasks(zips);
  const summary = [];
  for (const t of list) {
    try {
      const rows = await t.run(client, zips);
      summary.push({ source: t.source, status: "success", rows });
    } catch (err) {
      summary.push({
        source: t.source,
        status: "error",
        error: String(err.message || err),
      });
    }
  }
  return summary;
}
```

> Note: HUD requires a county FIPS that Census/geocode provides; the default task list omits HUD until a `county_fips` is resolved per zip. `pullHud(client, countyFips, zip)` is called from `seed.js` once `markets.county_fips` is populated, or wired in a follow-up. This keeps the daily run green even when HUD geocoding is incomplete.

- [ ] Run to pass: `cd updater && npm test run` — expect isolation test passing.
- [ ] Commit: `feat(updater): runAllSources orchestrator with per-source try/catch isolation`.

### Task 9 — Seed script + cron scheduler

**Files:** `updater/seed.js`, `updater/index.js`

- [ ] Write `updater/seed.js`:

```js
import "dotenv/config";
import { pool, runSchema } from "./db.js";
import { runAllSources } from "./run.js";

const SEED_ZIPS = (process.env.SEED_ZIPS || "17101,17102,19103,15213")
  .split(",")
  .map((z) => z.trim());

async function main() {
  await runSchema();
  const summary = await runAllSources({ zips: SEED_ZIPS });
  // eslint-disable-next-line no-console
  console.log("Seed complete:", JSON.stringify(summary));
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
```

- [ ] Write `updater/index.js`:

```js
import "dotenv/config";
import cron from "node-cron";
import { runSchema } from "./db.js";
import { runAllSources } from "./run.js";

const SCHEDULE = process.env.CRON_SCHEDULE || "0 3 * * *";
const SEED_ZIPS = (process.env.SEED_ZIPS || "17101,17102,19103,15213")
  .split(",")
  .map((z) => z.trim());

async function tick() {
  const summary = await runAllSources({ zips: SEED_ZIPS });
  // eslint-disable-next-line no-console
  console.log(new Date().toISOString(), "refresh:", JSON.stringify(summary));
}

await runSchema();
cron.schedule(SCHEDULE, tick);
// eslint-disable-next-line no-console
console.log(`Updater scheduled: ${SCHEDULE} for zips ${SEED_ZIPS.join(",")}`);
```

- [ ] Run to verify seed end-to-end (real Docker Postgres; requires API keys in `updater/.env`): `cd updater && npm run seed` — expect `Seed complete:` with per-source statuses; sources lacking keys show `status:"error"` but the process exits 0 and others succeed.
- [ ] Run to verify rows landed: `docker exec propintel_db psql -U propintel -d propintel -c "SELECT source, COUNT(*) FROM economic_indicators GROUP BY source;"` — expect at least one row group.
- [ ] Commit: `feat(updater): one-shot seed script and node-cron daily scheduler`.

### Task 10 — Next-side DB pool + neighborhood repo (read path)

**Files:** `lib/db/pool.js`, `lib/db/neighborhoodRepo.js`

- [ ] Write `lib/db/pool.js`:

```js
import pg from "pg";

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://propintel:propintel@localhost:5432/propintel",
    });
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}
```

- [ ] Write `lib/db/neighborhoodRepo.js`:

```js
import { query } from "./pool.js";

/**
 * Reads seeded Postgres data for a zip and assembles a result shaped like the
 * live API response. Returns null on a complete miss (no market + no indicators).
 * @param {string} zip
 * @returns {Promise<object|null>}
 */
export async function getNeighborhoodFromDb(zip) {
  const market = await query("SELECT * FROM markets WHERE zip=$1", [zip]);
  const econ = await query(
    "SELECT metric, value, source, period, updated_at FROM economic_indicators WHERE geo=$1",
    [zip],
  );
  const rent = await query(
    "SELECT bedroom, fmr, period FROM rent_benchmarks WHERE zip=$1 ORDER BY bedroom",
    [zip],
  );

  if (market.rows.length === 0 && econ.rows.length === 0) return null;

  const m = Object.fromEntries(
    econ.rows.map((r) => [r.metric, Number(r.value)]),
  );
  const fmrByBed = Object.fromEntries(rent.rows.map((r) => [r.bedroom, r.fmr]));

  const dataAsOf =
    [...econ.rows, ...market.rows]
      .map((r) => r.updated_at || r.last_refreshed)
      .filter(Boolean)
      .sort()
      .pop() || null;

  const occupied = m.occupied_units || null;
  const total = m.total_units || null;
  const renterRate = occupied ? (m.renter_units / occupied) * 100 : null;
  const vacancyRate = total ? (m.vacant_units / total) * 100 : null;
  const unemploymentRate = m.labor_force
    ? (m.unemployed / m.labor_force) * 100
    : null;
  const priceToRentRatio =
    m.median_rent && m.median_home_value
      ? m.median_home_value / (m.median_rent * 12)
      : null;

  return {
    location: {
      city: market.rows[0]?.city || null,
      state: market.rows[0]?.state || null,
      zip,
      stateCode: market.rows[0]?.state_code || null,
    },
    census: {
      medianIncome: m.median_income ?? null,
      medianRent: m.median_rent ?? null,
      medianHomeValue: m.median_home_value ?? null,
      population: m.population ?? null,
      zhvi: m.zhvi ?? null,
      renterRate,
      vacancyRate,
      unemploymentRate,
      priceToRentRatio,
    },
    fmr: {
      studio: fmrByBed[0] ?? null,
      oneBed: fmrByBed[1] ?? null,
      twoBed: fmrByBed[2] ?? null,
      threeBed: fmrByBed[3] ?? null,
      fourBed: fmrByBed[4] ?? null,
      isSafmr: rent.rows.length > 0,
    },
    source: "postgres",
    dataAsOf,
  };
}
```

- [ ] Run to verify import compiles: `node -e "import('./lib/db/neighborhoodRepo.js').then(()=>console.log('repo-ok'))"` — expect `repo-ok`.
- [ ] Commit: `feat(api): Postgres-backed neighborhood repository with dataAsOf`.

### Task 11 — Read-path integration test (real Dockerized Postgres)

**Files:** `app/api/neighborhood/__tests__/readpath.test.js`

- [ ] Ensure schema is loaded into the running Docker Postgres: `cd updater && node -e "import('./db.js').then(m=>m.runSchema().then(()=>m.pool.end()))"`.
- [ ] Write `app/api/neighborhood/__tests__/readpath.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPool } from "../../../../lib/db/pool.js";
import { getNeighborhoodFromDb } from "../../../../lib/db/neighborhoodRepo.js";

const ZIP = "99001"; // throwaway test zip

describe("getNeighborhoodFromDb (real Postgres)", () => {
  beforeAll(async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO markets (zip, city, state, state_code) VALUES ($1,'Testville','Pennsylvania','PA') ON CONFLICT (zip) DO UPDATE SET city='Testville'`,
      [ZIP],
    );
    await pool.query(
      `INSERT INTO economic_indicators (geo, metric, value, source, period) VALUES ($1,'median_income',60000,'CENSUS_ACS5','2022-12-31') ON CONFLICT (geo,metric,source,period) DO UPDATE SET value=60000`,
      [ZIP],
    );
    await pool.query(
      `INSERT INTO rent_benchmarks (zip, bedroom, fmr, source, period) VALUES ($1,2,1200,'HUD_FMR','2025') ON CONFLICT (zip,bedroom,source,period) DO UPDATE SET fmr=1200`,
      [ZIP],
    );
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM markets WHERE zip=$1", [ZIP]);
    await pool.query("DELETE FROM economic_indicators WHERE geo=$1", [ZIP]);
    await pool.query("DELETE FROM rent_benchmarks WHERE zip=$1", [ZIP]);
    await pool.end();
  });

  it("returns assembled result with dataAsOf for a seeded zip", async () => {
    const out = await getNeighborhoodFromDb(ZIP);
    expect(out.location.city).toBe("Testville");
    expect(out.census.medianIncome).toBe(60000);
    expect(out.fmr.twoBed).toBe(1200);
    expect(out.source).toBe("postgres");
    expect(out.dataAsOf).toBeTruthy();
  });

  it("returns null for an unseeded zip", async () => {
    const out = await getNeighborhoodFromDb("00000");
    expect(out).toBeNull();
  });
});
```

- [ ] Run to fail first (before Docker up / schema): `npx vitest run app/api/neighborhood/__tests__/readpath.test.js` — expect connection or relation error if DB not ready (confirms the test actually hits Postgres).
- [ ] Bring DB up + load schema, then run to pass: `docker compose up -d db && sleep 6 && cd updater && node -e "import('./db.js').then(m=>m.runSchema().then(()=>m.pool.end()))" && cd .. && npx vitest run app/api/neighborhood/__tests__/readpath.test.js` — expect both tests passing.
- [ ] Commit: `test(api): read-path integration test against Dockerized Postgres`.

### Task 12 — Rewire `app/api/neighborhood/route.js` (Postgres-first)

**Files:** `app/api/neighborhood/route.js`

- [ ] Read the current file (already done in planning) and extract the existing live logic into a local `fetchLive(zip, beds)` function returning the same `result` object, then prepend the Postgres-first branch. Final `GET`:

```js
import { NextResponse } from "next/server";
import { getNeighborhoodFromDb } from "../../../lib/db/neighborhoodRepo.js";

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");
  const beds = searchParams.get("beds") || "3";

  if (!zip || zip.length !== 5) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
  }

  // 1. Postgres-first: seeded data is always present, so no 500 on missing keys.
  try {
    const dbResult = await getNeighborhoodFromDb(zip);
    if (dbResult) return NextResponse.json(dbResult);
  } catch (err) {
    console.error("Neighborhood DB read failed, falling back to live:", err);
  }

  // 2. In-memory cache for live responses.
  const cached = cache.get(zip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // 3. Live fallback (existing behaviour, now only reached on DB miss).
  try {
    const result = await fetchLive(zip, beds);
    cache.set(zip, { data: result, timestamp: Date.now() });
    return NextResponse.json({
      ...result,
      source: "live",
      dataAsOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Neighborhood API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch neighborhood intelligence" },
      { status: 500 },
    );
  }
}
```

- [ ] Move all existing geocode + Census + HUD + scoring logic (lines 21–193 of the original file) verbatim into `async function fetchLive(zip, beds) { ... return result; }`. Keep the existing missing-keys guard inside `fetchLive` (it now only fires on a DB miss, not on every request).
- [ ] Run to verify route still compiles: `npx vitest run app/api/neighborhood/__tests__/readpath.test.js` — expect still passing (repo unchanged) and no import errors from the route.
- [ ] Run to verify Postgres-first behaviour manually: `docker compose up -d db && (cd updater && node -e "import('./db.js').then(m=>m.runSchema().then(()=>m.pool.end()))") && (cd updater && npm run seed) && npm run dev &` then `curl 'http://localhost:3000/api/neighborhood?zip=17101'` — expect JSON with `"source":"postgres"` and a `"dataAsOf"` field, even with Census/HUD keys unset.
- [ ] Commit: `refactor(api): Postgres-first neighborhood route with live fallback and stale-data timestamp`.

### Task 13 — Wire vitest config + README run notes

**Files:** `updater/vitest.config.js`, root `package.json` (test script only), `README.md` (data-platform section)

- [ ] Write `updater/vitest.config.js`:

```js
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.js"] },
});
```

- [ ] Add to root `package.json` scripts (do NOT remove existing scripts): `"test:api": "vitest run app/api/neighborhood/__tests__"`.
- [ ] Add a "Data Platform" section to `README.md` documenting: `docker compose up -d db`, `cd updater && npm install && npm run seed`, `npm start` (cron), required env vars, and the Postgres-first fallback behaviour.
- [ ] Run to verify full updater suite: `cd updater && npm test` — expect all upsert/parse/run tests passing.
- [ ] Commit: `chore: vitest config, test scripts, and data-platform README`.
