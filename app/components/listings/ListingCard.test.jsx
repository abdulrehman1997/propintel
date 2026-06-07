import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListingCard } from "./ListingCard";

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

describe("ListingCard", () => {
  it("shows price, address, and bed/bath/sqft", () => {
    render(<ListingCard listing={listing} onCompare={() => {}} />);
    expect(screen.getByText("$285,000")).toBeInTheDocument();
    expect(screen.getByText(/Harrisburg, PA/)).toBeInTheDocument();
    expect(screen.getByText(/3 bd/)).toBeInTheDocument();
  });

  it("fires onCompare when the compare button is clicked", () => {
    const onCompare = vi.fn();
    render(<ListingCard listing={listing} onCompare={onCompare} />);
    fireEvent.click(screen.getByRole("button", { name: /compare/i }));
    expect(onCompare).toHaveBeenCalledWith(listing);
  });
});
