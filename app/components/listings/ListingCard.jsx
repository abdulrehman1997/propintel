"use client";
import Link from "next/link";
import { cn } from "../../lib/cn";
import { formatCurrency } from "../../lib/format";

export function ListingCard({ listing: l, onCompare, selected = false }) {
  return (
    <div
      className={cn(
        "card-shell p-2 transition-shadow",
        selected && "ring-2 ring-forest-500 rounded-[inherit]",
      )}
    >
      <div className="card-core overflow-hidden relative">
        {selected && (
          <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-forest-700 text-paper-50 text-xs flex items-center justify-center shadow-soft">
            ✓
          </span>
        )}
        <div className="relative">
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
          <span
            className={cn(
              "absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full",
              l.status === "sold"
                ? "bg-ink-900/80 text-paper-50"
                : "bg-forest-700/90 text-paper-50",
            )}
          >
            {l.status === "sold" ? "Recently Sold" : "For Sale"}
          </span>
        </div>
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
              aria-pressed={selected}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-4 py-2.5 border transition-colors",
                selected
                  ? "bg-forest-700 text-paper-50 border-forest-700 hover:bg-forest-800"
                  : "border-paper-200 hover:border-forest-300",
              )}
            >
              {selected ? "✓ In Compare" : "+ Compare"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
