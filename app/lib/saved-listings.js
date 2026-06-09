// app/lib/saved-listings.js
"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "propintel.savedListings.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(listings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function useSavedListings() {
  const [saved, setSaved] = useState([]);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    setSaved(load());
  }, []);

  function save(listing) {
    setSaved((prev) => {
      if (prev.some((l) => l.id === listing.id)) return prev;
      const next = [...prev, listing];
      persist(next);
      return next;
    });
  }

  function remove(id) {
    setSaved((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persist(next);
      return next;
    });
  }

  function isSaved(id) {
    return saved.some((l) => l.id === id);
  }

  return { saved, save, remove, isSaved };
}
