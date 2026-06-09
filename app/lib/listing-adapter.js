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
  // Rent precedence: Zillow rentZestimate (real, per-property) → HUD FMR for the
  // ZIP+beds → conservative 0.7%-of-price fallback. Guard null fmr.
  const rent =
    (Number(listing.rent_zestimate) > 0
      ? Number(listing.rent_zestimate)
      : null) ??
    rentFromFmr(fmr || {}, beds) ??
    Math.round(price * 0.007);

  return {
    ...DEFAULT_RESIDENTIAL,
    purchasePrice: price,
    bedrooms: beds,
    zipCode: listing.zip || "",
    monthlyRent: rent,
    annualPropertyTax: Math.round(price * PROPERTY_TAX_RATE),
  };
}
