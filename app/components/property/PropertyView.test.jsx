// app/components/property/PropertyView.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children }) => <div>{children}</div>,
    },
  ),
  AnimatePresence: ({ children }) => children,
}));

import { PropertyView } from "./PropertyView";

const inputs = {
  purchasePrice: 285000,
  downPaymentPct: 20,
  interestRate: 7,
  loanTermYears: 30,
  annualPropertyTax: 3135,
  annualInsurance: 1800,
  monthlyHOA: 0,
  monthlyRent: 1750,
  vacancyPct: 5,
  managementPct: 10,
  maintenancePct: 1,
  capExPct: 5,
  holdYears: 5,
  appreciationPct: 3,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  exitCapRate: 0,
  saleCostPct: 6,
  bedrooms: 3,
  zipCode: "17101",
};

describe("PropertyView", () => {
  it("renders the tabbed analysis with the inputs collapsed by default", () => {
    render(<PropertyView initialInputs={inputs} />);
    expect(screen.getByText("Deal Analysis")).toBeInTheDocument();
    // The numeric inputs are hidden until Customize is clicked.
    expect(screen.queryByLabelText(/purchase price/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /customize/i }),
    ).toBeInTheDocument();
  });

  it("reveals editable inputs when Customize is clicked", () => {
    render(<PropertyView initialInputs={inputs} />);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(
      screen.getAllByText(/Property & Purchase|Purchase Price/i).length,
    ).toBeGreaterThan(0);
  });
});
