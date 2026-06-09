// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const sql = readFileSync(
  fileURLToPath(new URL("../schema.sql", import.meta.url)),
  "utf8",
);
describe("listings schema", () => {
  it("creates the listings table with required columns", () => {
    expect(sql).toMatch(/create table if not exists listings/i);
    for (const col of [
      "id",
      "source",
      "status",
      "street",
      "city",
      "state",
      "zip",
      "price",
      "beds",
      "baths",
      "sqft",
      "lot_acres",
      "property_type",
      "list_date",
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });
  it("indexes zip and price", () => {
    expect(sql).toMatch(/create index if not exists .*listings.*zip/i);
    expect(sql).toMatch(/create index if not exists .*listings.*price/i);
  });
});
