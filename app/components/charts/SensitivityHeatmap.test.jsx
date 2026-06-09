import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensitivityHeatmap, buildSensitivityGrid } from "./SensitivityHeatmap";

describe("buildSensitivityGrid", () => {
  it("produces a row per rate delta and a cell per cap delta", () => {
    const grid = buildSensitivityGrid({
      baseInputs: { purchasePrice: 350000, interestRate: 7 },
      compute: (inputs) => inputs.interestRate * 10,
    });
    expect(grid.length).toBe(5);
    expect(grid[0].cells.length).toBe(5);
  });
});

describe("SensitivityHeatmap", () => {
  it("renders a table grid of cells", () => {
    render(
      <SensitivityHeatmap
        baseInputs={{ purchasePrice: 350000, interestRate: 7 }}
        compute={(i) => i.interestRate}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("cell").length).toBeGreaterThanOrEqual(25);
  });
});
