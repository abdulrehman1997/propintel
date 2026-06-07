"use client";
import { createContext, useContext, useEffect, useState } from "react";

const KEY = "propintel.compare.v1";
const MAX = 4;
const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore malformed */
    }
  }, []);

  const persist = (next) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  const add = (listing) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === listing.id)) return prev;
      if (prev.length >= MAX) return prev;
      const next = [...prev, listing];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  };
  const remove = (id) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  };
  const clear = () => persist([]);

  return (
    <CompareContext.Provider value={{ items, add, remove, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
