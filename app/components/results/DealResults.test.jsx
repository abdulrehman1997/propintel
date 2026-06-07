import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag) =>
        ({ children, ...rest }) => {
          const { layoutId: _l, initial: _i, animate: _a, ...htmlProps } = rest;
          return <div {...htmlProps}>{children}</div>;
        },
    },
  ),
  AnimatePresence: ({ children }) => children,
}));

import { DealResults } from "./DealResults";

const results = {
  mode: "residential",
  investmentGrade: "B",
  investmentScore: 67,
  monthlyCashFlow: 350,
  cashOnCash: 7.2,
  capRate: 5.4,
  GRM: 12.5,
  onePercentRule: 0.9,
  annualROI: 9.1,
  irr: 11.5,
  equityMultiple: 1.8,
  dscr: 1.3,
  debtYield: 9.5,
  exitValue: 410000,
  redFlags: [],
};

const commercialResults = {
  mode: "commercial",
  assetType: "multifamily",
  investmentGrade: "B",
  investmentScore: 70,
  noi: 120000,
  goingInCap: 6,
  exitCapRate: 6.5,
  oer: 40,
  pricePerUnit: 250000,
  pricePerSF: 166,
  value: 2000000,
  maxLoan: 1400000,
  bindingConstraint: "DSCR",
  equity: 600000,
  dscr: 1.3,
  debtYield: 9,
  annualDebtService: 90000,
  leveredIRR: 12.4,
  unleveredIRR: 7.8,
  equityMultiple: 1.9,
  cashOnCash: 8,
  leverageAccretive: true,
  breakEvenOccupancy: 80,
  monthlyCashFlow: 2500,
  redFlags: [],
};

describe("DealResults", () => {
  it("shows the investment grade and rounded score", () => {
    render(<DealResults results={results} />);
    expect(screen.getByText("B")).toBeInTheDocument();
    // Score renders as a rounded number node followed by a separate "/ 100" span.
    expect(screen.getByText("67")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });
  it("renders residential IRR and equity multiple", () => {
    render(<DealResults results={results} />);
    expect(screen.getByText("11.50%")).toBeInTheDocument(); // IRR
    expect(screen.getByText("1.80x")).toBeInTheDocument(); // equity multiple
  });
  it("renders commercial debt sizing and levered/unlevered IRR", () => {
    render(<DealResults results={commercialResults} />);
    expect(screen.getByText(/binding constraint/i)).toBeInTheDocument();
    expect(screen.getAllByText("DSCR").length).toBeGreaterThan(0);
    expect(screen.getByText("Levered IRR")).toBeInTheDocument();
    expect(screen.getByText("Unlevered IRR")).toBeInTheDocument();
    expect(screen.getByText("12.40%")).toBeInTheDocument();
    expect(screen.getByText("7.80%")).toBeInTheDocument();
  });
});
