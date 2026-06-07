-- PropIntel data platform schema
-- All tables are idempotent (CREATE TABLE IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS markets (
  zip          TEXT PRIMARY KEY,
  city         TEXT,
  state        TEXT,
  state_code   TEXT,
  county_fips  TEXT,
  lat          DOUBLE PRECISION,
  lon          DOUBLE PRECISION,
  last_refreshed TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rent_benchmarks (
  id        SERIAL PRIMARY KEY,
  zip       TEXT        NOT NULL,
  bedroom   INTEGER     NOT NULL,  -- 0=studio,1,2,3,4
  fmr       NUMERIC     NOT NULL,
  source    TEXT        NOT NULL,  -- e.g. 'HUD_FMR'
  period    TEXT        NOT NULL,  -- e.g. '2025'
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (zip, bedroom, source, period)
);

CREATE TABLE IF NOT EXISTS economic_indicators (
  id        SERIAL PRIMARY KEY,
  geo       TEXT        NOT NULL,  -- zip or FIPS or 'US'
  metric    TEXT        NOT NULL,  -- e.g. 'median_income', 'mortgage_rate_30y'
  value     NUMERIC     NOT NULL,
  source    TEXT        NOT NULL,  -- e.g. 'CENSUS_ACS5', 'FRED', 'BLS', 'ZILLOW_ZHVI'
  period    TEXT        NOT NULL,  -- ISO date string or year string
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (geo, metric, source, period)
);

CREATE TABLE IF NOT EXISTS refresh_log (
  id         SERIAL PRIMARY KEY,
  source     TEXT        NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status     TEXT,        -- 'success' | 'error'
  rows_upserted INTEGER,
  error_msg  TEXT
);

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
