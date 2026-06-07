// Zillow live-data importer (RapidAPI). Fetches listings WITH photos + real
// addresses + rent estimates into the `listings` table, so the site serves
// from Postgres (no per-visit API calls). Periodic refresh-safe (idempotent).
//
// Config via env (key/host are secrets — keep them in .env, never commit):
//   RAPIDAPI_KEY    required
//   RAPIDAPI_HOST   default real-estate-zillow-com.p.rapidapi.com
//   ZILLOW_API_PATH default /search/bylocation  (override to the for-sale endpoint)
//   ZILLOW_LOCATIONS comma list, e.g. "NY,New York,Brooklyn" (default "NY")
//   ZILLOW_MAX_PAGES default 1
import { pool } from "./db.js";

const KEY = process.env.RAPIDAPI_KEY;
const HOST =
  process.env.RAPIDAPI_HOST || "real-estate-zillow-com.p.rapidapi.com";
const PATH = process.env.ZILLOW_API_PATH || "/search/bylocation";
const LOCATIONS = (process.env.ZILLOW_LOCATIONS || "NY")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_PAGES = Number(process.env.ZILLOW_MAX_PAGES || 1);

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

// Map one API listing object to our `listings` row shape.
export function mapZillowListing(l) {
  const h = l.hdpData?.homeInfo || {};
  const zip = String(l.addressZipcode || h.zipcode || "").trim();
  const price = num(l.unformattedPrice ?? h.price);
  if (!zip || price == null || price <= 0) return null;

  const rawStatus = String(l.statusType || h.homeStatus || "").toUpperCase();
  const status = rawStatus.includes("SALE")
    ? "for_sale"
    : rawStatus.includes("SOLD")
      ? "sold"
      : "for_sale";

  const lot = h.lotAreaUnit === "acres" ? num(h.lotAreaValue) : null;

  return {
    source: "ZILLOW_API",
    status,
    street: (l.addressStreet || h.streetAddress || "").trim() || null,
    city: (l.addressCity || h.city || "").trim() || null,
    state: (l.addressState || h.state || "").trim().toUpperCase() || null,
    zip: zip.padStart(5, "0").slice(0, 5),
    price,
    beds: int(l.beds ?? h.bedrooms),
    baths: num(l.baths ?? h.bathrooms),
    sqft: int(l.area ?? h.livingArea),
    lot_acres: lot,
    property_type: (h.homeType || "single_family").toLowerCase(),
    photo_url: l.imgSrc || null,
    zpid: l.zpid != null ? String(l.zpid) : null,
    latitude: num(l.latLong?.latitude ?? h.latitude),
    longitude: num(l.latLong?.longitude ?? h.longitude),
    rent_zestimate: num(h.rentZestimate),
    detail_url: l.detailUrl || null,
  };
}

export async function upsertZillowListings(rows) {
  for (const r of rows) {
    await pool.query(
      `INSERT INTO listings
         (source,status,street,city,state,zip,price,beds,baths,sqft,lot_acres,
          property_type,photo_url,zpid,latitude,longitude,rent_zestimate,detail_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (source, street, zip, price) DO UPDATE SET
         status=EXCLUDED.status, beds=EXCLUDED.beds, baths=EXCLUDED.baths,
         sqft=EXCLUDED.sqft, lot_acres=EXCLUDED.lot_acres,
         property_type=EXCLUDED.property_type, photo_url=EXCLUDED.photo_url,
         zpid=EXCLUDED.zpid, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
         rent_zestimate=EXCLUDED.rent_zestimate, detail_url=EXCLUDED.detail_url,
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
        r.photo_url,
        r.zpid,
        r.latitude,
        r.longitude,
        r.rent_zestimate,
        r.detail_url,
      ],
    );
  }
}

async function fetchPage(location, page) {
  const url = `https://${HOST}${PATH}?location=${encodeURIComponent(location)}&page=${page}`;
  const res = await fetch(url, {
    headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST },
  });
  if (!res.ok)
    throw new Error(`Zillow API ${res.status} for ${location} p${page}`);
  const body = await res.json();
  return body?.data?.listings || [];
}

export async function importZillow() {
  if (!KEY) {
    // eslint-disable-next-line no-console
    console.warn("zillow: RAPIDAPI_KEY not set — skipping live import");
    return 0;
  }
  let kept = 0;
  for (const location of LOCATIONS) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      let raw;
      try {
        raw = await fetchPage(location, page);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("zillow fetch error:", e.message);
        break;
      }
      if (!raw.length) break;
      const rows = raw.map(mapZillowListing).filter(Boolean);
      if (rows.length) await upsertZillowListings(rows);
      kept += rows.length;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`zillow: imported ${kept} listings (${LOCATIONS.join(", ")})`);
  return kept;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importZillow()
    .then(() => pool.end())
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exit(1);
    });
}
