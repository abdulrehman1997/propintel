// app/property/[id]/PropertyClient.jsx
"use client";
import { useMemo } from "react";
import { listingToResidentialInputs } from "../../lib/listing-adapter";
import { formatCurrency } from "../../lib/format";
import { PropertyView } from "../../components/property/PropertyView";
import { useSavedListings } from "../../lib/saved-listings";

export function PropertyClient({ listing, fmr, neighborhood }) {
  const initialInputs = useMemo(
    () => listingToResidentialInputs(listing, fmr || {}),
    [listing, fmr],
  );
  const { save, remove, isSaved } = useSavedListings();
  const saved = isSaved(listing.id);

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-medium text-ink-900">
            {listing.street}
          </h1>
          <p className="text-ink-500">
            {listing.city}, {listing.state} {listing.zip} &middot;{" "}
            {formatCurrency(listing.price)} &middot; {listing.beds} bd &middot;{" "}
            {listing.baths ?? "—"} ba &middot;{" "}
            {listing.sqft ? `${listing.sqft} sqft` : "— sqft"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (saved ? remove(listing.id) : save(listing))}
          aria-label={saved ? "Remove from saved" : "Save property"}
          className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-4 py-2.5 border transition-colors ${
            saved
              ? "bg-forest-700 text-paper-50 border-forest-700 hover:bg-forest-800"
              : "border-paper-200 text-ink-600 hover:border-forest-300 hover:text-forest-700"
          }`}
        >
          {saved ? "♥ Saved" : "♥ Save"}
        </button>
      </header>
      <PropertyView
        initialInputs={initialInputs}
        neighborhoodData={neighborhood}
      />
    </main>
  );
}
