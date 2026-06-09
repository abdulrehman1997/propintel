// updater/listings.js
// Imports the Kaggle Realtor.com CSV into the `listings` table.
// Idempotent: re-running upserts on (source, street, zip, price).
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";
import { pool } from "./db.js";
import { normalizeListing } from "./lib/normalizeListing.js";

const CSV_PATH = fileURLToPath(
  new URL("./data/realtor-data.csv", import.meta.url),
);

export async function upsertListings(rows) {
  for (const r of rows) {
    await pool.query(
      `INSERT INTO listings
         (source,status,street,city,state,zip,price,beds,baths,sqft,lot_acres,property_type,list_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (source, street, zip, price) DO UPDATE SET
         status=EXCLUDED.status, beds=EXCLUDED.beds, baths=EXCLUDED.baths,
         sqft=EXCLUDED.sqft, lot_acres=EXCLUDED.lot_acres,
         property_type=EXCLUDED.property_type, list_date=EXCLUDED.list_date,
         imported_at=now()`,
      [
        r.source,
        r.status,
        r.street,
        r.city,
        r.state,
        r.zip,
        r.price,
        r.beds,
        r.baths,
        r.sqft,
        r.lot_acres,
        r.property_type,
        r.list_date,
      ],
    );
  }
}

const MAX_ROWS = Number(process.env.LISTINGS_MAX || 40000);
// Optional single-state focus, e.g. LISTINGS_STATE=NY to load only New York.
const STATE_FILTER = (process.env.LISTINGS_STATE || "").trim().toUpperCase();

export async function importListings() {
  const batch = [];
  let kept = 0;
  const parser = createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true }),
  );
  for await (const row of parser) {
    const n = normalizeListing(row);
    if (!n) continue;
    if (STATE_FILTER && n.state !== STATE_FILTER) continue;
    batch.push(n);
    kept++;
    if (batch.length >= 500) {
      await upsertListings(batch.splice(0));
    }
    if (kept >= MAX_ROWS) break;
  }
  if (batch.length) await upsertListings(batch);
  // eslint-disable-next-line no-console
  console.log(
    `listings: imported ${kept} rows${STATE_FILTER ? ` (state=${STATE_FILTER})` : ""}`,
  );
  return kept;
}

// Allow `node updater/listings.js` standalone.
if (import.meta.url === `file://${process.argv[1]}`) {
  importListings()
    .then(() => pool.end())
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exit(1);
    });
}
