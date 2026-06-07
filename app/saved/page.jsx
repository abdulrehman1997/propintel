"use client";
import { useSavedListings } from "../lib/saved-listings";
import { ListingCard } from "../components/listings/ListingCard";
import { useCompare } from "../lib/compare-store";

export default function SavedPage() {
  const { saved, remove } = useSavedListings();
  const { toggle } = useCompare();

  if (saved.length === 0) {
    return (
      <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-20 text-center">
        <h1 className="font-display text-2xl font-medium text-ink-900 mb-3">
          Saved Properties
        </h1>
        <p className="text-ink-400">
          You haven&apos;t saved any properties yet. Browse listings and click
          &ldquo;Save&rdquo; to add them here.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-ink-900">
          Saved Properties
          <span className="ml-2 text-base font-normal text-ink-400">
            ({saved.length})
          </span>
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((listing) => (
          <div key={listing.id} className="relative">
            <ListingCard listing={listing} onCompare={toggle} />
            <button
              type="button"
              onClick={() => remove(listing.id)}
              aria-label={`Remove ${listing.street} from saved`}
              className="absolute top-3 right-3 text-[11px] font-semibold uppercase tracking-[0.14em] bg-paper-50 border border-paper-200 hover:border-red-300 hover:text-red-600 rounded-full px-3 py-1.5"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
