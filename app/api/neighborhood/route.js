import { NextResponse } from "next/server";
import { getNeighborhoodFromDb } from "../../../lib/db/neighborhoodRepo.js";

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Graceful-degradation payload: a fully-shaped neighborhood object with every
// metric nulled out. Returned (HTTP 200) when no data source is reachable —
// Postgres is unseeded AND the live APIs can't run (keys missing) or the ZIP
// can't be resolved. The UI already renders null census/fmr fields as "—" / "N/A"
// and shows a "—" score when no real metric is present, so a 200 with this shape
// degrades cleanly instead of erroring the whole neighborhood panel.
function emptyNeighborhood(zip, message) {
  return {
    location: { city: null, state: null, zip, stateCode: null },
    census: {
      medianIncome: null,
      medianRent: null,
      medianHomeValue: null,
      population: null,
      renterUnits: null,
      occupiedUnits: null,
      vacantUnits: null,
      totalUnits: null,
      unemployed: null,
      laborForce: null,
      renterRate: null,
      vacancyRate: null,
      unemploymentRate: null,
      priceToRentRatio: null,
    },
    fmr: { isSafmr: false },
    neighborhoodScore: null,
    scoreBreakdown: {
      incomeScore: null,
      vacancyScore: null,
      unemploymentScore: null,
      priceToRentScore: null,
    },
    dataAsOf: null,
    source: "unavailable",
    message,
  };
}

// ─── Live API fallback ────────────────────────────────────────────────────────

async function fetchLive(zip) {
  const CENSUS_API_KEY = process.env.CENSUS_API_KEY;
  const HUD_API_TOKEN = process.env.HUD_API_TOKEN;

  if (!CENSUS_API_KEY || !HUD_API_TOKEN) {
    return {
      error: "API keys missing",
      details: "Set up CENSUS_API_KEY and HUD_API_TOKEN in .env.local",
    };
  }

  // 1. Geocode to get state code
  const geoResponse = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&addressdetails=1&limit=1`,
    { headers: { "User-Agent": "PropIntel/1.0" } },
  );
  const geoData = await geoResponse.json();
  if (!geoData || geoData.length === 0) throw new Error("Location not found");

  const stateCode = geoData[0].address["ISO3166-2-lvl4"]?.split("-")[1] || "";

  // 2. Fetch county entity ID from HUD
  let entityId = null;
  try {
    const countiesRes = await fetch(
      `https://www.huduser.gov/hudapi/public/fmr/listCounties/${stateCode}`,
      { headers: { Authorization: `Bearer ${HUD_API_TOKEN}` } },
    );
    if (countiesRes.ok) {
      const counties = await countiesRes.json();
      const countyName = geoData[0].address.county?.replace(" County", "");
      const match = counties.find(
        (c) =>
          c.county_name.includes(countyName) ||
          c.fips_code.startsWith(
            geoData[0].address["ISO3166-2-lvl4"]?.split("-")[1],
          ),
      );
      if (match) entityId = match.fips_code;
    }
  } catch (e) {
    console.error("HUD County List Error:", e);
  }

  // 3. Parallel Census + HUD calls
  const censusUrl =
    `https://api.census.gov/data/2022/acs/acs5` +
    `?get=NAME,B19013_001E,B25064_001E,B25077_001E,B01003_001E,` +
    `B25003_003E,B25002_002E,B25002_003E,B25002_001E,B23025_005E,B23025_003E` +
    `&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_API_KEY}`;
  const hudUrl = entityId
    ? `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}?year=2025`
    : null;

  const [censusRes, hudRes] = await Promise.allSettled([
    fetch(censusUrl),
    hudUrl
      ? fetch(hudUrl, { headers: { Authorization: `Bearer ${HUD_API_TOKEN}` } })
      : Promise.reject("No Entity ID"),
  ]);

  let censusData = null;
  if (censusRes.status === "fulfilled") {
    const response = censusRes.value;
    if (response.ok) {
      const clonedRes = response.clone();
      try {
        const rows = await response.json();
        if (rows && rows.length > 1) {
          const row = rows[1];
          const val = (v) => (Number(v) < 0 ? null : Number(v));
          censusData = {
            medianIncome: val(row[1]),
            medianRent: val(row[2]),
            medianHomeValue: val(row[3]),
            population: val(row[4]),
            renterUnits: val(row[5]),
            occupiedUnits: val(row[6]),
            vacantUnits: val(row[7]),
            totalUnits: val(row[8]),
            unemployed: val(row[9]),
            laborForce: val(row[10]),
          };
        }
      } catch (e) {
        const text = await clonedRes.text();
        if (text.includes("invalid_key")) {
          console.error("Census API key not yet active");
        }
      }
    }
  }

  let fmrData = { isSafmr: false };
  if (hudRes.status === "fulfilled") {
    const response = hudRes.value;
    if (response.ok) {
      try {
        const hudJson = await response.json();
        const basicdata = hudJson.data?.basicdata;
        if (basicdata) {
          const zipRow = basicdata.find((r) => r.zip_code === zip);
          const msaRow = basicdata.find((r) => r.zip_code === "MSA level");
          const source = zipRow || msaRow;
          if (source) {
            fmrData = {
              studio: source["Efficiency"],
              oneBed: source["One-Bedroom"],
              twoBed: source["Two-Bedroom"],
              threeBed: source["Three-Bedroom"],
              fourBed: source["Four-Bedroom"],
              isSafmr: !!zipRow,
            };
          }
        }
      } catch (e) {
        console.error("HUD JSON Parse Error:", e);
      }
    }
  }

  const cd = censusData || {
    medianIncome: null,
    medianRent: null,
    medianHomeValue: null,
    population: null,
    renterUnits: null,
    occupiedUnits: null,
    vacantUnits: null,
    totalUnits: null,
    unemployed: null,
    laborForce: null,
  };

  const renterRate = cd.occupiedUnits
    ? (cd.renterUnits / cd.occupiedUnits) * 100
    : null;
  const vacancyRate = cd.totalUnits
    ? (cd.vacantUnits / cd.totalUnits) * 100
    : null;
  const unemploymentRate = cd.laborForce
    ? (cd.unemployed / cd.laborForce) * 100
    : null;
  const priceToRentRatio =
    cd.medianRent && cd.medianHomeValue
      ? cd.medianHomeValue / (cd.medianRent * 12)
      : null;

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const incomeScore = cd.medianIncome
    ? clamp((cd.medianIncome - 40000) / 600, 0, 100)
    : 50;
  const vacancyScore =
    vacancyRate !== null ? clamp(100 - vacancyRate * 6, 0, 100) : 50;
  const unemploymentScore =
    unemploymentRate !== null ? clamp(100 - unemploymentRate * 10, 0, 100) : 50;
  const p2rScore =
    priceToRentRatio !== null
      ? clamp(100 - (priceToRentRatio - 10) * 3.5, 10, 100)
      : 50;

  const neighborhoodScore = Math.round(
    incomeScore * 0.35 +
      vacancyScore * 0.25 +
      unemploymentScore * 0.2 +
      p2rScore * 0.2,
  );

  return {
    location: {
      city:
        geoData[0].address.suburb ||
        geoData[0].address.city_district ||
        geoData[0].address.city ||
        geoData[0].address.town ||
        geoData[0].display_name.split(",")[0],
      state: geoData[0].address.state,
      zip,
      stateCode,
    },
    census: {
      ...cd,
      renterRate,
      vacancyRate,
      unemploymentRate,
      priceToRentRatio,
    },
    fmr: fmrData,
    neighborhoodScore,
    scoreBreakdown: {
      incomeScore,
      vacancyScore,
      unemploymentScore,
      priceToRentScore: p2rScore,
    },
    dataAsOf: null,
    source: "live",
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");

  if (!zip || zip.length !== 5) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
  }

  // In-memory cache check (works for both postgres and live results)
  const cached = cache.get(zip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Try Postgres first
    let result = null;
    try {
      result = await getNeighborhoodFromDb(zip);
    } catch (dbErr) {
      console.error(
        "Postgres read error (falling back to live):",
        dbErr.message,
      );
    }

    // 2. Fall back to live APIs on cache miss
    if (!result) {
      const liveResult = await fetchLive(zip);
      // fetchLive returns an error shape (no location key) when keys are missing.
      // Neighborhood data is supplementary context, not core underwriting, so a
      // missing-keys state degrades to an empty 200 payload (UI shows "—" / "N/A")
      // rather than a 500 that breaks the whole panel. Don't cache the degraded
      // shape — keys/seed may appear later in the same process.
      if (liveResult.error) {
        return NextResponse.json(
          emptyNeighborhood(zip, liveResult.details || liveResult.error),
        );
      }
      result = liveResult;
    }

    cache.set(zip, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    // Unexpected failures (geocode miss, network error, upstream API down) also
    // degrade gracefully: the neighborhood panel renders "data unavailable"
    // instead of surfacing a hard error over the entire analysis.
    console.error("Neighborhood API error:", error);
    return NextResponse.json(
      emptyNeighborhood(zip, "Neighborhood data is temporarily unavailable."),
    );
  }
}
