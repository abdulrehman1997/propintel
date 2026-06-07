// app/api/listings/[id]/route.js
import { NextResponse } from "next/server";
import { getListingById } from "../../../../lib/db/listingsRepo.js";

export async function GET(_request, context) {
  const { id } = await context.params;
  try {
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ listing });
  } catch (err) {
    console.error("Listing detail API error:", err);
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
}
