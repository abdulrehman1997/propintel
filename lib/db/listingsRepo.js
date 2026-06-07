// lib/db/listingsRepo.js
import { getPool } from "./pool.js";

const DEFAULT_PAGE_SIZE = 24;

// Pure query builder — unit-testable without a DB.
// Sanity bounds: the source data has a long tail of non-home rows (vacant land,
// parking, data errors at $1-$25k) and a few absurd outliers. Exclude them by
// default so results read as real homes. Callers can still set min/maxPrice.
const PRICE_FLOOR = 25000;
const PRICE_CEILING = 50000000;

export function buildListingsQuery(f = {}) {
  const where = [
    "status = 'for_sale'",
    `price >= ${PRICE_FLOOR}`,
    `price <= ${PRICE_CEILING}`,
  ];
  const values = [];
  const add = (clause, val) => {
    values.push(val);
    where.push(clause.replace("$?", `$${values.length}`));
  };
  if (f.zip) add("zip = $?", String(f.zip));
  if (f.state) add("state = $?", String(f.state).toUpperCase());
  if (f.city) add("lower(city) = lower($?)", String(f.city));
  if (f.beds) add("beds >= $?", Number(f.beds));
  if (f.minPrice) add("price >= $?", Number(f.minPrice));
  if (f.maxPrice) add("price <= $?", Number(f.maxPrice));

  const pageSize =
    Number(f.pageSize) > 0 ? Number(f.pageSize) : DEFAULT_PAGE_SIZE;
  const page = Number(f.page) > 0 ? Number(f.page) : 1;
  values.push(pageSize);
  const limitIdx = values.length;
  values.push((page - 1) * pageSize);
  const offsetIdx = values.length;

  const text = `SELECT id, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date
     FROM listings
     WHERE ${where.join(" AND ")}
     ORDER BY price ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
  return { text, values };
}

export async function findListings(filters) {
  const { text, values } = buildListingsQuery(filters);
  const { rows } = await getPool().query(text, values);
  return rows;
}

export async function getListingById(id) {
  const { rows } = await getPool().query(
    `SELECT id, street, city, state, zip, price, beds, baths, sqft, lot_acres, property_type, list_date
     FROM listings WHERE id = $1`,
    [Number(id)],
  );
  return rows[0] || null;
}
