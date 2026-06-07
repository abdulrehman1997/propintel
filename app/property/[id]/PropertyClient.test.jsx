// app/property/[id]/PropertyClient.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { PropertyClient } from "./PropertyClient";

const listing = {
  id: 1,
  street: "412 Mulberry St",
  city: "Harrisburg",
  state: "PA",
  zip: "17101",
  price: 285000,
  beds: 3,
  baths: 2,
  sqft: 1540,
};

describe("PropertyClient", () => {
  it("renders the address and the pre-filled tabbed analysis", () => {
    render(
      <PropertyClient
        listing={listing}
        fmr={{ threeBed: 1750 }}
        neighborhood={null}
      />,
    );
    expect(screen.getByText(/412 Mulberry St/)).toBeInTheDocument();
    expect(screen.getByText("Deal Analysis")).toBeInTheDocument();
    expect(screen.getByText(/\$285,000/)).toBeInTheDocument();
  });
});
