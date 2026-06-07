"use client";
import Link from "next/link";
import { useCompare } from "../../lib/compare-store";

export function Nav() {
  const { items } = useCompare();
  return (
    <nav className="flex items-center gap-6 px-6 md:px-10 py-4 border-b border-paper-200 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
      <Link
        href="/search"
        className="font-display text-forest-700 text-base normal-case tracking-normal"
      >
        PropIntel
      </Link>
      <Link href="/search" className="hover:text-forest-700">
        Search
      </Link>
      <Link href="/saved" className="hover:text-forest-700">
        Saved
      </Link>
      <Link href="/compare" className="ml-auto hover:text-forest-700">
        Compare ({items.length})
      </Link>
    </nav>
  );
}
