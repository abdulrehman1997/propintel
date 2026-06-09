import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent } from "./format";

describe("formatCurrency", () => {
  it("formats positive numbers as USD", () => {
    expect(formatCurrency(1500)).toBe("$1,500");
  });
  it("formats negative numbers", () => {
    expect(formatCurrency(-200)).toBe("-$200");
  });
  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
  it("handles null/undefined gracefully", () => {
    expect(formatCurrency(null)).toBe("$0");
    expect(formatCurrency(undefined)).toBe("$0");
  });
});

describe("formatPercent", () => {
  it("formats a decimal as percentage string with 2 decimals", () => {
    expect(formatPercent(5.2)).toBe("5.20%");
  });
  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });
  it("renders N/A for an undefined metric (null), not a misleading 0.00%", () => {
    expect(formatPercent(null)).toBe("N/A");
    expect(formatPercent(undefined)).toBe("N/A");
    expect(formatPercent(NaN)).toBe("N/A");
  });
});
