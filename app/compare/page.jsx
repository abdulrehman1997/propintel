"use client";
import { useEffect, useState } from "react";
import { useCompare } from "../lib/compare-store";
import { listingToResidentialInputs } from "../lib/listing-adapter";
import { analyzeResidentialDeal } from "../lib/engine-adapter";
import { CompareMatrix } from "../components/compare/CompareMatrix";

export default function ComparePage() {
  const { items, remove } = useCompare();
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all(
      items.map(async (listing) => {
        let fmr = {};
        try {
          const r = await fetch(`/api/neighborhood?zip=${listing.zip}`);
          const d = await r.json();
          fmr = d.fmr || {};
        } catch {
          /* degrade to price-based rent */
        }
        const results = analyzeResidentialDeal(
          listingToResidentialInputs(listing, fmr),
        );
        return { listing, results };
      }),
    ).then((cols) => active && setColumns(cols));
    return () => {
      active = false;
    };
  }, [items]);

  return (
    <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <h1 className="font-display text-2xl font-medium text-ink-900">
        Compare ({items.length})
      </h1>
      {columns.length === 0 ? (
        <p className="text-ink-400 text-sm">
          No properties selected. Add up to 4 from search.
        </p>
      ) : (
        <CompareMatrix columns={columns} onRemove={remove} />
      )}
    </main>
  );
}
