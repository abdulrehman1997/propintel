module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/neighborhood/route.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const zip = searchParams.get('zip');
    const beds = searchParams.get('beds') || '3';
    if (!zip || zip.length !== 5) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Invalid zip code'
        }, {
            status: 400
        });
    }
    // Check cache
    const cached = cache.get(zip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(cached.data);
    }
    const CENSUS_API_KEY = process.env.CENSUS_API_KEY;
    const HUD_API_TOKEN = process.env.HUD_API_TOKEN;
    console.log('Environment Check:', {
        hasCensusKey: !!CENSUS_API_KEY,
        censusKeyPrefix: CENSUS_API_KEY ? CENSUS_API_KEY.substring(0, 4) + '...' : 'NONE',
        hasHudToken: !!HUD_API_TOKEN
    });
    if (!CENSUS_API_KEY || !HUD_API_TOKEN) {
        // If keys are missing, we still want the app to function but return a specific error
        // so the frontend knows why location intel is disabled.
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'API keys missing',
            details: 'Set up CENSUS_API_KEY and HUD_API_TOKEN in .env.local'
        }, {
            status: 500
        });
    }
    try {
        // 1. Geocode first to get state code if not provided (actually frontend should pass it or we fetch it here)
        // We'll fetch it here to be robust
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&addressdetails=1&limit=1`, {
            headers: {
                'User-Agent': 'PropIntel/1.0'
            }
        });
        const geoData = await geoResponse.json();
        if (!geoData || geoData.length === 0) throw new Error('Location not found');
        const stateCode = geoData[0].address['ISO3166-2-lvl4']?.split('-')[1] || '';
        // 2. Fetch County Entity ID from HUD
        let entityId = null;
        try {
            const countiesRes = await fetch(`https://www.huduser.gov/hudapi/public/fmr/listCounties/${stateCode}`, {
                headers: {
                    'Authorization': `Bearer ${HUD_API_TOKEN}`
                }
            });
            if (countiesRes.ok) {
                const counties = await countiesRes.json();
                // Try to match by county name from Nominatim
                const countyName = geoData[0].address.county?.replace(' County', '');
                const match = counties.find((c)=>c.county_name.includes(countyName) || c.fips_code.startsWith(geoData[0].address['ISO3166-2-lvl4']?.split('-')[1]));
                if (match) entityId = match.fips_code;
            }
        } catch (e) {
            console.error('HUD County List Error:', e);
        }
        // 3. Parallel calls to Census and HUD
        const censusUrl = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B19013_001E,B25064_001E,B25077_001E,B01003_001E,B25003_003E,B25002_002E,B25002_003E,B25002_001E,B23025_005E,B23025_003E&for=zip%20code%20tabulation%20area:${zip}&key=${CENSUS_API_KEY}`;
        const hudUrl = entityId ? `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}?year=2025` : null;
        const [censusRes, hudRes] = await Promise.allSettled([
            fetch(censusUrl),
            hudUrl ? fetch(hudUrl, {
                headers: {
                    'Authorization': `Bearer ${HUD_API_TOKEN}`
                }
            }) : Promise.reject('No Entity ID')
        ]);
        let censusData = null;
        let censusError = null;
        if (censusRes.status === 'fulfilled') {
            const response = censusRes.value;
            if (response.ok) {
                const clonedRes = response.clone();
                try {
                    const rows = await response.json();
                    if (rows && rows.length > 1) {
                        const row = rows[1];
                        const val = (v)=>Number(v) < 0 ? null : Number(v);
                        censusData = {
                            medianIncome: val(row[1]),
                            medianRent: val(row[2]),
                            medianHomeValue: val(row[3]),
                            population: val(row[4]),
                            renterUnits: val(row[5]),
                            occupiedUnits: val(row[6]),
                            vacantUnits: val(row[7]),
                            totalUnits: val(row[8]),
                            unemployed: val(row[9]),
                            laborForce: val(row[10])
                        };
                    }
                } catch (e) {
                    const text = await clonedRes.text();
                    if (text.includes('invalid_key')) {
                        censusError = "Census API key not yet active. Please check your email and wait 30-60 mins.";
                    }
                }
            }
        }
        let fmrData = {
            isSafmr: false
        };
        if (hudRes.status === 'fulfilled') {
            const response = hudRes.value;
            if (response.ok) {
                try {
                    const hudJson = await response.json();
                    const basicdata = hudJson.data?.basicdata;
                    if (basicdata) {
                        // Find our specific zip in the county-wide list
                        const zipRow = basicdata.find((r)=>r.zip_code === zip);
                        const msaRow = basicdata.find((r)=>r.zip_code === 'MSA level');
                        const source = zipRow || msaRow;
                        if (source) {
                            fmrData = {
                                studio: source["Efficiency"],
                                oneBed: source["One-Bedroom"],
                                twoBed: source["Two-Bedroom"],
                                threeBed: source["Three-Bedroom"],
                                fourBed: source["Four-Bedroom"],
                                isSafmr: !!zipRow
                            };
                        }
                    }
                } catch (e) {
                    console.error('HUD JSON Parse Error:', e);
                }
            }
        }
        // If censusData is missing, we proceed with null values for demographics but keep FMR/Score as possible
        const cd = censusData || {
            medianIncome: null,
            medianRent: null,
            medianHomeValue: null,
            population: null,
            renterUnits: null,
            occupiedUnits: null,
            vacantUnits: null,
            totalUnits: null,
            unemployed: null,
            laborForce: null
        };
        const hasCensus = !!censusData;
        // Calculations
        const renterRate = cd.occupiedUnits ? cd.renterUnits / cd.occupiedUnits * 100 : null;
        const vacancyRate = cd.totalUnits ? cd.vacantUnits / cd.totalUnits * 100 : null;
        const unemploymentRate = cd.laborForce ? cd.unemployed / cd.laborForce * 100 : null;
        const priceToRentRatio = cd.medianRent && cd.medianHomeValue ? cd.medianHomeValue / (cd.medianRent * 12) : null;
        // Scores
        const clamp = (val, min, max)=>Math.min(Math.max(val, min), max);
        const incomeScore = cd.medianIncome ? clamp((cd.medianIncome - 40000) / 600, 0, 100) : 50;
        const vacancyScore = vacancyRate !== null ? clamp(100 - vacancyRate * 6, 0, 100) : 50;
        const unemploymentScore = unemploymentRate !== null ? clamp(100 - unemploymentRate * 10, 0, 100) : 50;
        const p2rScore = priceToRentRatio !== null ? clamp(100 - (priceToRentRatio - 10) * 3.5, 10, 100) : 50;
        const neighborhoodScore = Math.round(incomeScore * 0.35 + vacancyScore * 0.25 + unemploymentScore * 0.20 + p2rScore * 0.20);
        const result = {
            location: {
                city: geoData[0].address.suburb || geoData[0].address.city_district || geoData[0].address.city || geoData[0].address.town || geoData[0].display_name.split(',')[0],
                state: geoData[0].address.state,
                zip,
                stateCode
            },
            census: {
                ...censusData,
                renterRate,
                vacancyRate,
                unemploymentRate,
                priceToRentRatio
            },
            fmr: fmrData,
            neighborhoodScore,
            scoreBreakdown: {
                incomeScore,
                vacancyScore,
                unemploymentScore,
                priceToRentScore: p2rScore
            }
        };
        // Cache result
        cache.set(zip, {
            data: result,
            timestamp: Date.now()
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
    } catch (error) {
        console.error('Neighborhood API error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch neighborhood intelligence'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0sx62u1._.js.map