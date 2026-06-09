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
Return ONLY raw JSON. Allowed keys (omit any the user did not mention):
  q            city name or 5-digit ZIP (string)
  minPrice     minimum price USD (integer)
  maxPrice     maximum price USD (integer)
  beds         minimum bedrooms (integer)
  minBaths     minimum bathrooms (number)
  propertyType one of: single_family, condo, townhouse, multi_family
  status       one of: for_sale, sold
  minYield     minimum gross rental yield percent (number)
  grade        screening grade one of: A, B, C, D
Rules: "under 300k" -> maxPrice 300000. "3 bed" -> beds 3. "good yield" -> grade A.
Never invent keys outside this list. Output JSON only, no prose, no markdown.`;

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
