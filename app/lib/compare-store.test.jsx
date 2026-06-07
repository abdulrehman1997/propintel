// app/lib/compare-store.test.jsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CompareProvider, useCompare } from "./compare-store.jsx";

const wrapper = ({ children }) => <CompareProvider>{children}</CompareProvider>;

describe("useCompare", () => {
  beforeEach(() => localStorage.clear());

  it("adds, caps at 4, and removes by id", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => {
      [1, 2, 3, 4, 5].forEach((id) => result.current.add({ id, price: id }));
    });
    expect(result.current.items).toHaveLength(4); // capped
    act(() => result.current.remove(1));
    expect(result.current.items.find((i) => i.id === 1)).toBeUndefined();
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useCompare(), { wrapper });
    act(() => result.current.add({ id: 9, price: 100 }));
    expect(localStorage.getItem("propintel.compare.v1")).toContain("9");
  });
});
