import { describe, it, expect } from "vitest";
import { mapZillowListing } from "../zillow.js";

// A real listing object from the real-estate-zillow-com response.
const sample = {
  zpid: "30147318",
  imgSrc:
    "https://photos.zillowstatic.com/fp/ffb45a0a14030230eac6ce47323d0f90-p_e.jpg",
  detailUrl:
    "https://www.zillow.com/homedetails/32-Sachson-Pl-Wappingers-Falls-NY-12590/30147318_zpid/",
  statusType: "SOLD",
  unformattedPrice: 550000,
  addressStreet: "32 Sachson Place",
  addressCity: "Wappingers Falls",
  addressState: "NY",
  addressZipcode: "12590",
  beds: 4,
  baths: 3,
  area: 2203,
  latLong: { latitude: 41.592487, longitude: -73.88734 },
  hdpData: {
    homeInfo: {
      rentZestimate: 4121,
      lotAreaValue: 0.46,
      lotAreaUnit: "acres",
      homeType: "SINGLE_FAMILY",
    },
  },
};

describe("mapZillowListing", () => {
  it("maps the API shape to a listings row with photo + rent estimate", () => {
    const r = mapZillowListing(sample);
    expect(r).toMatchObject({
      source: "ZILLOW_API",
      status: "sold",
      street: "32 Sachson Place",
      city: "Wappingers Falls",
      state: "NY",
      zip: "12590",
      price: 550000,
      beds: 4,
      baths: 3,
      sqft: 2203,
      lot_acres: 0.46,
      zpid: "30147318",
      rent_zestimate: 4121,
      photo_url:
        "https://photos.zillowstatic.com/fp/ffb45a0a14030230eac6ce47323d0f90-p_e.jpg",
      latitude: 41.592487,
      longitude: -73.88734,
    });
  });

  it("classifies FOR_SALE status and pads zip", () => {
    const r = mapZillowListing({
      ...sample,
      statusType: "FOR_SALE",
      addressZipcode: "601",
    });
    expect(r.status).toBe("for_sale");
    expect(r.zip).toBe("00601");
  });

  it("returns null without a price or zip", () => {
    expect(mapZillowListing({ ...sample, unformattedPrice: 0 })).toBeNull();
    expect(
      mapZillowListing({ ...sample, addressZipcode: "", hdpData: {} }),
    ).toBeNull();
  });
});
