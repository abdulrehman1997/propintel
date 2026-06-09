import { NextResponse } from "next/server";
import { findListings } from "../../../lib/db/listingsRepo.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    zip: searchParams.get("zip") || undefined,
    state: searchParams.get("state") || undefined,
    city: searchParams.get("city") || undefined,
    beds: searchParams.get("beds") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    minBaths: searchParams.get("minBaths") || undefined,
    propertyType: searchParams.get("propertyType") || undefined,
    status: searchParams.get("status") || undefined,
    minYield: searchParams.get("minYield") || undefined,
    grade: searchParams.get("grade") || undefined,
    page: searchParams.get("page") || undefined,
  };
  try {
    const listings = await findListings(filters);
    return NextResponse.json({ listings, source: "postgres" });
  } catch (err) {
    // Listings are read-only context; an unseeded/unreachable DB degrades to
    // an empty list rather than a 500 that breaks the search page.
    console.error("Listings API error:", err);
    return NextResponse.json({ listings: [], source: "unavailable" });
  }
}
