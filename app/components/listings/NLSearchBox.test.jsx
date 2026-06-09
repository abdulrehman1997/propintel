import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NLSearchBox } from "./NLSearchBox";

describe("NLSearchBox", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("posts the query and applies the returned filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ beds: 3, q: "Harrisburg" }),
      }),
    );
    const onApply = vi.fn();
    render(<NLSearchBox onApply={onApply} />);
    fireEvent.change(screen.getByLabelText(/describe/i), {
      target: { value: "3 bed in Harrisburg" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ beds: 3, q: "Harrisburg" }),
      ),
    );
  });

  it("shows a fallback message and does not apply on error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: "nl-unavailable" }),
      }),
    );
    const onApply = vi.fn();
    render(<NLSearchBox onApply={onApply} />);
    fireEvent.change(screen.getByLabelText(/describe/i), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() =>
      expect(screen.getByText(/use the filters below/i)).toBeInTheDocument(),
    );
    expect(onApply).not.toHaveBeenCalled();
  });
});
