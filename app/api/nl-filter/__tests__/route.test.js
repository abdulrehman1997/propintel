import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route.js";

const post = (body) =>
  new Request("http://localhost/api/nl-filter", {
    method: "POST",
    body: JSON.stringify(body),
  });

const ollamaOk = (obj) => ({
  ok: true,
  json: async () => ({ message: { content: JSON.stringify(obj) } }),
});

describe("POST /api/nl-filter", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a validated filter object on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ollamaOk({ beds: 3, maxPrice: 300000, q: "Harrisburg" }),
      ),
    );
    const res = await POST(post({ query: "3 bed under 300k in Harrisburg" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ beds: 3, maxPrice: 300000, q: "Harrisburg" });
  });

  it("strips hallucinated keys via strict schema -> nl-unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ollamaOk({ beds: 2, listingType: "sale" })),
    );
    const res = await POST(post({ query: "2 bed for sale" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.error).toBe("nl-unavailable");
  });

  it("degrades when Ollama is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    const res = await POST(post({ query: "anything" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.error).toBe("nl-unavailable");
  });

  it("rejects an over-long query without calling Ollama", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const res = await POST(post({ query: "x".repeat(301) }));
    const body = await res.json();
    expect(body.error).toBe("invalid-query");
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a missing query", async () => {
    const res = await POST(post({}));
    const body = await res.json();
    expect(body.error).toBe("invalid-query");
  });
});
