"use client";
import { useEffect, useState } from "react";

export function useListings(filters) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v != null && v !== ""),
    ).toString();
    let active = true;
    setLoading(true);
    fetch(`/api/listings?${qs}`)
      .then((r) => r.json())
      .then((d) => active && setListings(d.listings || []))
      .catch(() => active && setListings([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { listings, loading };
}
