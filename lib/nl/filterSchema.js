// lib/nl/filterSchema.js
import { z } from "zod";

// Validates model output. .strict() drops hallucinated keys; bounds clamp ranges.
export const NlFilterSchema = z
  .object({
    q: z.string().max(100).optional(),
    minPrice: z.coerce.number().int().min(0).max(50_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(50_000_000).optional(),
    beds: z.coerce.number().int().min(0).max(20).optional(),
    minBaths: z.coerce.number().min(0).max(20).optional(),
    propertyType: z
      .enum(["single_family", "condo", "townhouse", "multi_family"])
      .optional(),
    status: z.enum(["for_sale", "sold"]).optional(),
    minYield: z.coerce.number().min(0).max(100).optional(),
    grade: z.enum(["A", "B", "C", "D"]).optional(),
  })
  .strict();

export const NL_SYSTEM_PROMPT = `You convert a natural-language real-estate search into a JSON filter object.
Output ONLY raw JSON containing ONLY the keys the user EXPLICITLY states. Omit every other key. Never guess or default. Do NOT add grade or minYield unless the user mentions yield, return, or cash flow.

Keys:
  q location only: city/ZIP/neighborhood/borough (string)
  minPrice integer USD
  maxPrice integer USD
  beds integer (minimum bedrooms)
  minBaths number (minimum bathrooms)
  propertyType one of: single_family, condo, townhouse, multi_family
  status one of: for_sale, sold
  minYield number (min gross yield %) — ONLY if yield/return/cash flow mentioned
  grade one of A,B,C,D — ONLY if user says good/high yield (good -> A)

Mapping:
  "under 300k" -> maxPrice 300000. "over 200k"/"above 200k" -> minPrice 200000.
  "between 150k and 400k" -> minPrice 150000, maxPrice 400000.
  "3 bed" -> beds 3. "over 2 baths"/"2+ baths"/"at least 2 baths" -> minBaths 2.
  "apartment"/"flat" -> condo. "house"/"homes" -> single_family. "duplex"/"multi family" -> multi_family.
  A place name ALWAYS goes in q. Property-type words NEVER go in q. JSON only, no prose.

Examples:
User: 3 bed apartments in Brooklyn
{"q":"Brooklyn","beds":3,"propertyType":"condo"}
User: houses under 250k in 17101 for sale
{"q":"17101","maxPrice":250000,"propertyType":"single_family","status":"for_sale"}
User: sold townhomes over 2 baths
{"propertyType":"townhouse","status":"sold","minBaths":2}
User: 2 bed under 300000
{"beds":2,"maxPrice":300000}
User: condos in Harrisburg with good yield
{"q":"Harrisburg","propertyType":"condo","grade":"A"}`;

// JSON schema passed to Ollama's `format` to constrain output.
export const NL_OLLAMA_FORMAT = {
  type: "object",
  properties: {
    q: { type: "string" },
    minPrice: { type: "number" },
    maxPrice: { type: "number" },
    beds: { type: "number" },
    minBaths: { type: "number" },
    propertyType: {
      type: "string",
      enum: ["single_family", "condo", "townhouse", "multi_family"],
    },
    status: { type: "string", enum: ["for_sale", "sold"] },
    minYield: { type: "number" },
    grade: { type: "string", enum: ["A", "B", "C", "D"] },
  },
  required: [],
};
