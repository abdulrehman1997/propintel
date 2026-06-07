"use client";

export function SearchFilters({ filters, onChange }) {
  const set = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const inputCls =
    "px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 outline-none";

  return (
    <div className="flex flex-wrap gap-2">
      <input
        className={`${inputCls} flex-1 min-w-0`}
        placeholder="City or ZIP"
        value={filters.q || ""}
        onChange={set("q")}
        aria-label="City or ZIP"
      />
      <input
        className={inputCls}
        type="number"
        placeholder="Min $"
        value={filters.minPrice || ""}
        onChange={set("minPrice")}
        aria-label="Minimum price"
      />
      <input
        className={inputCls}
        type="number"
        placeholder="Max $"
        value={filters.maxPrice || ""}
        onChange={set("maxPrice")}
        aria-label="Maximum price"
      />
      <input
        className={inputCls}
        type="number"
        placeholder="Beds"
        value={filters.beds || ""}
        onChange={set("beds")}
        aria-label="Minimum bedrooms"
      />
    </div>
  );
}
