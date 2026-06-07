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
