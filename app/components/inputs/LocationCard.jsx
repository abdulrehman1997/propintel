"use client";
import {
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card } from "../ui/Card";

/**
 * ZIP entry + neighborhood lookup trigger (residential only).
 * Presentational: the parent owns the zip value, fetch action, and result state.
 */
export const LocationCard = ({
  zipCode,
  onChange,
  onFetch,
  loading,
  error,
  data,
}) => (
  <Card title="Location" icon={MapPin}>
    <div className="flex gap-2">
      <input
        type="text"
        aria-label="ZIP code"
        placeholder="ZIP code"
        maxLength={5}
        value={zipCode}
        onChange={(e) => onChange("zipCode", e.target.value)}
        className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 focus:border-forest-400 outline-none transition-colors"
      />
      <button
        type="button"
        onClick={onFetch}
        disabled={loading}
        className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-forest-700 text-paper-50 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full hover:bg-forest-800 disabled:opacity-50 transition-all duration-200 hover:shadow-soft active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Search size={14} />
        )}
        Analyze
      </button>
    </div>
    {error && (
      <p className="mt-2.5 text-xs text-rose-500 flex items-center gap-1">
        <AlertCircle size={12} /> {error}
      </p>
    )}
    {data && (
      <p className="mt-2.5 text-xs text-emerald-600 flex items-center gap-1">
        <CheckCircle size={12} /> {data.location?.city}, {data.location?.state}
      </p>
    )}
  </Card>
);
