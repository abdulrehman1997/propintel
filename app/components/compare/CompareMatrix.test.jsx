import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompareMatrix } from "./CompareMatrix";

const cols = [
  {
    listing: {
      id: 1,
      street: "A St",
      city: "X",
      state: "PA",
      zip: "1",
      price: 250000,
      beds: 3,
    },
    results: {
      investmentGrade: "A",
      investmentScore: 81,
      monthlyCashFlow: 465,
      cashOnCash: 8.9,
      capRate: 6,
      irr: 14,
      dscr: 1.41,
    },
  },
  {
    listing: {
      id: 2,
      street: "B St",
      city: "Y",
      state: "PA",
      zip: "2",
      price: 312000,
      beds: 4,
    },
    results: {
      investmentGrade: "C",
      investmentScore: 58,
      monthlyCashFlow: 120,
      cashOnCash: 3.1,
      capRate: 4.2,
      irr: 7.5,
      dscr: 1.05,
    },
  },
];

describe("CompareMatrix", () => {
  it("renders a column per property and a row per metric", () => {
    render(<CompareMatrix columns={cols} onRemove={() => {}} />);
    expect(screen.getByText("A St")).toBeInTheDocument();
    expect(screen.getByText("B St")).toBeInTheDocument();
    expect(screen.getByText(/Cash flow/i)).toBeInTheDocument();
    expect(screen.getByText("$465")).toBeInTheDocument();
  });

  it("highlights the best cell in a row (highest cash flow)", () => {
    render(<CompareMatrix columns={cols} onRemove={() => {}} />);
    const best = screen.getByText("$465").closest("td");
    expect(best.className).toMatch(/emerald|best/);
  });
});
