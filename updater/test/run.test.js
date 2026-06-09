import { describe, it, expect, vi } from "vitest";
import { newDb } from "pg-mem";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runAllSources } from "../run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeDb() {
  const db = newDb();
  db.public.none(readFileSync(join(__dirname, "../schema.sql"), "utf8"));
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe("runAllSources isolation", () => {
  it("one failing source does not abort the run; both log to refresh_log", async () => {
    const client = makeDb();
    const ok = vi.fn().mockResolvedValue(3);
    const bad = vi.fn().mockRejectedValue(new Error("boom"));
    const summary = await runAllSources({
      client,
      zips: ["17101"],
      tasks: [
        { source: "CENSUS_ACS5", run: ok },
        { source: "FRED", run: bad },
      ],
    });
    expect(ok).toHaveBeenCalledOnce();
    expect(bad).toHaveBeenCalledOnce();
    expect(summary.find((s) => s.source === "CENSUS_ACS5").status).toBe(
      "success",
    );
    expect(summary.find((s) => s.source === "FRED").status).toBe("error");
  });

  it("returns success summary when all tasks pass", async () => {
    const client = makeDb();
    const t1 = vi.fn().mockResolvedValue(5);
    const t2 = vi.fn().mockResolvedValue(2);
    const summary = await runAllSources({
      client,
      zips: ["17101"],
      tasks: [
        { source: "HUD_FMR", run: t1 },
        { source: "BLS", run: t2 },
      ],
    });
    expect(summary.every((s) => s.status === "success")).toBe(true);
    expect(summary.find((s) => s.source === "HUD_FMR").rows).toBe(5);
  });
});
