import "dotenv/config";
import { pool, runSchema } from "./db.js";

const listings = [
  {
    street: "214 Walnut St",
    city: "Harrisburg",
    state: "PA",
    zip: "17101",
    price: 189000,
    beds: 3,
    baths: 1.5,
    sqft: 1480,
    lot_acres: 0.06,
    rent_zestimate: 1750,
  },
  {
    street: "812 Green St",
    city: "Harrisburg",
    state: "PA",
    zip: "17102",
    price: 265000,
    beds: 4,
    baths: 2,
    sqft: 1920,
    lot_acres: 0.08,
    rent_zestimate: 2350,
  },
  {
    street: "1508 Pine St",
    city: "Philadelphia",
    state: "PA",
    zip: "19103",
    price: 529000,
    beds: 2,
    baths: 2,
    sqft: 1225,
    lot_acres: 0.03,
    rent_zestimate: 3100,
  },
  {
    street: "233 S 22nd St",
    city: "Philadelphia",
    state: "PA",
    zip: "19103",
    price: 715000,
    beds: 3,
    baths: 2.5,
    sqft: 1840,
    lot_acres: 0.04,
    rent_zestimate: 4200,
  },
  {
    street: "4420 Forbes Ave",
    city: "Pittsburgh",
    state: "PA",
    zip: "15213",
    price: 338000,
    beds: 3,
    baths: 2,
    sqft: 1650,
    lot_acres: 0.07,
    rent_zestimate: 2600,
  },
  {
    street: "128 Oakland Ave",
    city: "Pittsburgh",
    state: "PA",
    zip: "15213",
    price: 489000,
    beds: 5,
    baths: 3,
    sqft: 2440,
    lot_acres: 0.1,
    rent_zestimate: 3800,
  },
];

async function main() {
  await runSchema();

  for (const listing of listings) {
    await pool.query(
      `INSERT INTO listings
        (source, status, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date, rent_zestimate)
       VALUES
        ('demo', 'for_sale', $1, $2, $3, $4, $5, $6, $7, $8, $9, 'single_family', CURRENT_DATE, $10)
       ON CONFLICT (source, street, zip, price) DO UPDATE SET
        status = EXCLUDED.status,
        beds = EXCLUDED.beds,
        baths = EXCLUDED.baths,
        sqft = EXCLUDED.sqft,
        lot_acres = EXCLUDED.lot_acres,
        rent_zestimate = EXCLUDED.rent_zestimate,
        imported_at = now()`,
      [
        listing.street,
        listing.city,
        listing.state,
        listing.zip,
        listing.price,
        listing.beds,
        listing.baths,
        listing.sqft,
        listing.lot_acres,
        listing.rent_zestimate,
      ],
    );
  }

  const { rows } = await pool.query(
    "SELECT count(*)::int AS count FROM listings WHERE source = 'demo'",
  );
  // eslint-disable-next-line no-console
  console.log(`Demo listings ready: ${rows[0].count}`);
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error("Demo listing seed failed:", err);
  await pool.end();
  process.exit(1);
});
