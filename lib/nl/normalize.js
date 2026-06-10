// lib/nl/normalize.js
// Deterministic overlay for NL filter extraction. LLMs (even qwen2.5:7b) are
// unreliable at exact numeric/keyword slots — they drop maxPrice, confuse
// "baths" with yield, and hallucinate grade. Regex is perfect at those slots,
// so we run it OVER the model output: the model owns fuzzy fields (q, type),
// this owns the mechanical ones and a yield-hallucination guard.

const YIELD_WORDS = /\b(yield|return|returns|cash\s*flow|cashflow|cap\s*rate)\b/i;

// Keyword -> propertyType. Order matters: more specific terms first so
// "townhouse" / "multi family home" don't fall through to single_family.
const TYPE_RULES = [
  [/\btown\s*(?:house|home)s?\b/i, "townhouse"],
  [/\b(?:condo|apartment|flat)s?\b/i, "condo"],
  [/\b(?:multi[\s-]*family|multifamily|duplex|triplex|fourplex)\b/i, "multi_family"],
  [/\b(?:single[\s-]*family|sfh|house|home)s?\b/i, "single_family"],
];

// q is a valid location only if it is a 5-digit ZIP or plain place text.
// Reject model junk like "between 150k and 400k" or property-type words.
const Q_NON_LOCATION =
  /\d\s*[km]\b|\$|\b(?:between|under|over|above|below|bed|bedroom|bath|for\s*sale|sold|yield)\b/i;

// "300k" -> 300000, "1.2m" -> 1200000, "250,000" -> 250000, "300" (k implied near price words handled by caller)
function parseMoney(numStr, suffix) {
  let n = Number(String(numStr).replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const s = (suffix || "").toLowerCase();
  if (s === "k") n *= 1_000;
  else if (s === "m") n *= 1_000_000;
  return Math.round(n);
}

const MONEY = String.raw`\$?\s*(\d[\d,]*(?:\.\d+)?)\s*([km])?`;

/**
 * Overlay deterministic slots parsed from the raw query onto the model's filters.
 * Deterministic values WIN for the slots they cover.
 * @param {string} query raw user text
 * @param {object} llm validated model output (may be partial)
 * @returns {object} merged filter object
 */
export function applyDeterministic(query = "", llm = {}) {
  const q = String(query);
  const out = { ...llm };

  // --- price range: "between X and Y" ---
  const between = q.match(new RegExp(`between\\s+${MONEY}\\s+and\\s+${MONEY}`, "i"));
  if (between) {
    const lo = parseMoney(between[1], between[2]);
    const hi = parseMoney(between[3], between[4]);
    if (lo != null) out.minPrice = lo;
    if (hi != null) out.maxPrice = hi;
  } else {
    // "under/below/up to X" -> maxPrice ; "over/above/at least/from X" -> minPrice
    const under = q.match(new RegExp(`(?:under|below|less than|up to|max)\\s+${MONEY}`, "i"));
    if (under) {
      const v = parseMoney(under[1], under[2]);
      if (v != null) out.maxPrice = v;
    }
    const over = q.match(new RegExp(`(?:over|above|more than|at least|from|min)\\s+${MONEY}`, "i"));
    if (over) {
      const v = parseMoney(over[1], over[2]);
      // guard: "at least 2 baths/beds" is NOT a price — require k/m suffix or >= 1000
      if (v != null && (over[2] || v >= 1000)) out.minPrice = v;
    }
  }

  // --- beds: "3 bed", "3br", "3 bedrooms" ---
  const beds = q.match(/(\d+)\s*(?:bed|br\b|bedroom)/i);
  if (beds) out.beds = Number(beds[1]);

  // --- baths: "2 bath", "2+ baths", "at least 2 baths", "over 2 ba" ---
  const baths = q.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:bath|ba\b)/i);
  if (baths) out.minBaths = Number(baths[1]);

  // --- property type (keyword-driven; deterministic beats the flaky model) ---
  for (const [re, type] of TYPE_RULES) {
    if (re.test(q)) {
      out.propertyType = type;
      break;
    }
  }

  // --- status ---
  if (/\bfor[\s-]*sale\b/i.test(q)) out.status = "for_sale";
  else if (/\bsold\b/i.test(q)) out.status = "sold";

  // --- q sanity: drop model junk that is not a real location ---
  if (out.q != null) {
    const qv = String(out.q).trim();
    const isZip = /^\d{5}$/.test(qv);
    if (qv === "" || (!isZip && Q_NON_LOCATION.test(qv))) delete out.q;
    else out.q = qv;
  }

  // --- yield-hallucination guard: drop grade/minYield unless user mentioned yield ---
  if (!YIELD_WORDS.test(q)) {
    delete out.grade;
    delete out.minYield;
  }
  // 0 yield is a no-op filter; drop it to keep the object clean
  if (out.minYield === 0) delete out.minYield;

  return out;
}
