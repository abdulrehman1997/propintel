// app/lib/saved-listings.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSavedListings } from "./saved-listings";

const STORAGE_KEY = "propintel.savedListings.v1";

const listing1 = {
  id: 1,
  street: "100 Main St",
  city: "Harrisburg",
  price: 200000,
};
const listing2 = { id: 2, street: "200 Oak Ave", city: "York", price: 150000 };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useSavedListings", () => {
  it("starts with an empty list when localStorage is empty", () => {
    const { result } = renderHook(() => useSavedListings());
    expect(result.current.saved).toEqual([]);
  });

  it("save adds a listing to the list", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
    });
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].id).toBe(1);
  });

  it("save dedupes by id — saving the same listing twice does not duplicate", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
    });
    act(() => {
      result.current.save(listing1);
    });
    expect(result.current.saved).toHaveLength(1);
  });

  it("save dedupes correctly when multiple listings already exist", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
      result.current.save(listing2);
    });
    act(() => {
      result.current.save(listing1);
    });
    expect(result.current.saved).toHaveLength(2);
  });

  it("remove deletes a listing by id", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
      result.current.save(listing2);
    });
    act(() => {
      result.current.remove(1);
    });
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].id).toBe(2);
  });

  it("remove is a no-op for an id not in the list", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
    });
    act(() => {
      result.current.remove(999);
    });
    expect(result.current.saved).toHaveLength(1);
  });

  it("isSaved returns true for a saved listing and false otherwise", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
    });
    expect(result.current.isSaved(1)).toBe(true);
    expect(result.current.isSaved(2)).toBe(false);
  });

  it("persists to localStorage under the correct key", () => {
    const { result } = renderHook(() => useSavedListings());
    act(() => {
      result.current.save(listing1);
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(1);
  });

  it("hydrates from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([listing2]));
    const { result } = renderHook(() => useSavedListings());
    expect(result.current.saved).toHaveLength(1);
    expect(result.current.saved[0].id).toBe(2);
  });
});
