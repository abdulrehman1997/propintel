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

// The Realtor.com dataset's `street` is an anonymized numeric id (e.g.
// "263302.0"), not a readable address. Keep real street names; drop
// numeric-only/empty values to null so the UI falls back to city/zip.
const cleanStreet = (v) => {
  const s = (v || "").trim();
  if (!s || /^\d+(\.\d+)?$/.test(s)) return null;
  return s;
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
    street: cleanStreet(row.street),
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
