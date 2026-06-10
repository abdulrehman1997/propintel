import { NextResponse } from "next/server";
import {
  NlFilterSchema,
  NL_SYSTEM_PROMPT,
  NL_OLLAMA_FORMAT,
} from "../../../lib/nl/filterSchema.js";
import { applyDeterministic } from "../../../lib/nl/normalize.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const MAX_QUERY = 300;
const TIMEOUT_MS = 8000;

const unavailable = () => NextResponse.json({ error: "nl-unavailable" });

export async function POST(request) {
  let query;
  try {
    ({ query } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid-query" });
  }
  if (typeof query !== "string" || query.trim().length === 0 || query.length > MAX_QUERY) {
    return NextResponse.json({ error: "invalid-query" });
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: NL_OLLAMA_FORMAT,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: NL_SYSTEM_PROMPT },
          { role: "user", content: query.trim() },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return unavailable();
    const data = await res.json();
    // The model owns fuzzy fields (q, propertyType); a deterministic overlay
    // owns the mechanical slots (price/beds/baths/status) and strips
    // hallucinated grade/yield. Validate the merged result.
    const raw = JSON.parse(data.message.content);
    const merged = applyDeterministic(query.trim(), raw);
    const parsed = NlFilterSchema.parse(merged);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("nl-filter error:", err);
    return unavailable();
  }
}
