"use client";
import Link from "next/link";
import { formatCurrency } from "../../lib/format";

export function ListingCard({ listing: l, onCompare }) {
  return (
    <div className="card-shell p-2">
      <div className="card-core overflow-hidden">
        {l.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.photo_url}
            alt={`${l.city}, ${l.state}`}
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="placeholder h-40 flex items-center justify-center text-ink-300">
            {l.city}
          </div>
        )}
        <div className="p-4 space-y-1">
          <p className="font-display text-xl font-medium text-ink-900">
            {formatCurrency(l.price)}
          </p>
          <p className="text-sm text-ink-600">
            {[l.street, `${l.city}, ${l.state} ${l.zip}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-ink-400">
            {l.beds} bd &middot; {l.baths ?? "—"} ba &middot;{" "}
            {l.sqft ? `${l.sqft} sqft` : "— sqft"}
          </p>
          <div className="flex gap-2 pt-2">
            <Link
              href={`/property/${l.id}`}
              className="flex-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] bg-forest-700 text-paper-50 rounded-full px-4 py-2.5 hover:bg-forest-800"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => onCompare(l)}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] border border-paper-200 hover:border-forest-300 rounded-full px-4 py-2.5"
            >
              + Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
