import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { analyzeBrrrrDeal } from "../../lib/engine-adapter";
import { BrrrrPanel } from "./BrrrrPanel";

// Known infinite-return fixture: all-in cost < refi loan, positive post-refi CF.
const infiniteInputs = {
  purchasePrice: 100000,
  rehabBudget: 30000,
  arv: 200000,
  refiLtv: 75,
  refiRate: 7,
  closingCostsBuyPct: 3,
  monthlyRent: 1800,
  vacancyPct: 5,
  managementPct: 8,
  maintenancePct: 1,
  capExPct: 5,
  annualPropertyTax: 1500,
  annualInsurance: 900,
};

describe("BrrrrPanel", () => {
  it("surfaces the infinite-return flag for a known fixture", () => {
    const results = analyzeBrrrrDeal(infiniteInputs);
    expect(results.infiniteReturn).toBe(true);
    render(
      <BrrrrPanel
        inputs={infiniteInputs}
        results={results}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("infinite-return")).toBeInTheDocument();
    expect(screen.getByText(/infinite return/i)).toBeInTheDocument();
  });

  it("shows cash-left-in-deal and post-refi cash flow metrics", () => {
    const results = analyzeBrrrrDeal(infiniteInputs);
    render(
      <BrrrrPanel
        inputs={infiniteInputs}
        results={results}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/cash left in deal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/post-refi cash flow/i).length).toBeGreaterThan(
      0,
    );
  });
});
