"use client";
import { useState } from "react";

export function NLSearchBox({ onApply }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/nl-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(true);
      } else {
        onApply({ q: "", ...data });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 outline-none"
          placeholder="Describe what you want — e.g. '3 bed condo under 300k in Harrisburg for sale'"
          aria-label="Describe what you want"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          aria-disabled={loading}
          className="px-4 py-2.5 text-sm rounded-xl bg-forest-600 text-white disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Search"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-ink-400">
          Could not parse that — use the filters below.
        </p>
      )}
    </div>
  );
}
