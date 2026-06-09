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
      <input
        className={inputCls}
        type="number"
        placeholder="Baths"
        value={filters.minBaths || ""}
        onChange={set("minBaths")}
        aria-label="Minimum bathrooms"
      />
      <select
        className={inputCls}
        value={filters.propertyType || ""}
        onChange={set("propertyType")}
        aria-label="Property type"
      >
        <option value="">Any type</option>
        <option value="single_family">Single family</option>
        <option value="condo">Condo</option>
        <option value="townhouse">Townhouse</option>
        <option value="multi_family">Multi-family</option>
      </select>
      <select
        className={inputCls}
        value={filters.status || ""}
        onChange={set("status")}
        aria-label="Listing status"
      >
        <option value="">For sale &amp; sold</option>
        <option value="for_sale">For sale</option>
        <option value="sold">Sold</option>
      </select>
      <input
        className={inputCls}
        type="number"
        step="0.1"
        placeholder="Min yield %"
        value={filters.minYield || ""}
        onChange={set("minYield")}
        aria-label="Minimum gross yield percent"
      />
      <select
        className={inputCls}
        value={filters.grade || ""}
        onChange={set("grade")}
        aria-label="Screening grade"
      >
        <option value="">Any grade</option>
        <option value="A">A — yield ≥ 10%</option>
        <option value="B">B — 7–10%</option>
        <option value="C">C — 4–7%</option>
        <option value="D">D — &lt; 4%</option>
      </select>
    </div>
  );
}
