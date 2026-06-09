import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub out all recharts components — they require a real browser layout engine.
// The test validates the component's own logic (empty state / data rendering),
// not recharts internals.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  LineChart: ({ children }) => <svg data-testid="line-chart">{children}</svg>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { ProjectionChart } from "./ProjectionChart";

const data = [
  { year: 1, propertyValue: 360000, equity: 80000, annualCashFlow: 2400 },
  { year: 2, propertyValue: 370000, equity: 90000, annualCashFlow: 2500 },
];

describe("ProjectionChart", () => {
  it("renders a chart container when projection data is provided", () => {
    render(<ProjectionChart projections={data} />);
    expect(screen.getByTestId("chart-container")).toBeTruthy();
  });
  it("renders a friendly empty state with no data", () => {
    render(<ProjectionChart projections={[]} />);
    expect(screen.getByText(/no projection data/i)).toBeTruthy();
  });
});
