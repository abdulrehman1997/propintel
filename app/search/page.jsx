"use client";
import { useState } from "react";
import { useListings } from "../lib/useListings";
import { useCompare } from "../lib/compare-store";
import { SearchFilters } from "../components/listings/SearchFilters";
import { ListingCard } from "../components/listings/ListingCard";

// Map the free-text q field to zip (5 digits) or city for the API.
function toApiFilters({ q, minPrice, maxPrice, beds }) {
  const f = {};
  if (minPrice) f.minPrice = minPrice;
  if (maxPrice) f.maxPrice = maxPrice;
  if (beds) f.beds = beds;
  const trimmed = (q || "").trim();
  if (/^\d{5}$/.test(trimmed)) {
    f.zip = trimmed;
  } else if (trimmed) {
    f.city = trimmed;
  }
  return f;
}

export default function SearchPage() {
  const [filters, setFilters] = useState({ q: "New York City" });
  const { listings, loading } = useListings(toApiFilters(filters));
  const { add } = useCompare();

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-8">
      <h1 className="font-display text-2xl font-medium text-ink-900">
        Find a property
      </h1>
      <SearchFilters filters={filters} onChange={setFilters} />
      {loading ? (
        <p className="text-ink-400 text-sm">Loading&hellip;</p>
      ) : listings.length === 0 ? (
        <p className="text-ink-400 text-sm">
          No listings found. Seed the database (<code>npm run seed</code>) or
          adjust filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onCompare={add} />
          ))}
        </div>
      )}
    </main>
  );
}
