import { describe, it, expect } from 'vitest';
import { parseCensusRow } from '../sources/census.js';
import { parseHudBasicData } from '../sources/hud.js';
import { parseFredLatest } from '../sources/fred.js';
import { parseBlsLatest } from '../sources/bls.js';
import { parseZillowCsv } from '../sources/zillow.js';

// ─── Census ───────────────────────────────────────────────────────────────────

describe('parseCensusRow', () => {
  it('maps ACS5 row to indicator records, dropping negative sentinels', () => {
    // header order: NAME,B19013_001E,B25064_001E,B25077_001E,B01003_001E,
    //               B25003_003E,B25002_002E,B25002_003E,B25002_001E,
    //               B23025_005E,B23025_003E,zip code tabulation area
    const row = ['Harrisburg', '55000', '1100', '180000', '49000', '8000', '12000', '900', '12900', '600', '24000', '17101'];
    const out = parseCensusRow('17101', row);
    const byMetric = Object.fromEntries(out.map((r) => [r.metric, r.value]));
    expect(byMetric.median_income).toBe(55000);
    expect(byMetric.median_rent).toBe(1100);
    expect(byMetric.median_home_value).toBe(180000);
    expect(byMetric.population).toBe(49000);
    expect(out.every((r) => r.source === 'CENSUS_ACS5' && r.period === '2022-12-31')).toBe(true);
  });

  it('drops negative Census sentinel values (e.g. -666666666)', () => {
    const row = ['X', '-666666666', '1100', '180000', '49000', '8000', '12000', '900', '12900', '600', '24000', '17101'];
    const out = parseCensusRow('17101', row);
    expect(out.find((r) => r.metric === 'median_income')).toBeUndefined();
  });
});

// ─── HUD ──────────────────────────────────────────────────────────────────────

describe('parseHudBasicData', () => {
  it('extracts FMR by bedroom for the target zip when SAFMR present', () => {
    const basicdata = [
      { zip_code: '17101', Efficiency: 800, 'One-Bedroom': 900, 'Two-Bedroom': 1100, 'Three-Bedroom': 1400, 'Four-Bedroom': 1700 },
      { zip_code: 'MSA level', Efficiency: 700, 'One-Bedroom': 850, 'Two-Bedroom': 1000, 'Three-Bedroom': 1300, 'Four-Bedroom': 1600 },
    ];
    const out = parseHudBasicData('17101', basicdata, '2025');
    const byBed = Object.fromEntries(out.map((r) => [r.bedroom, r.fmr]));
    expect(byBed[0]).toBe(800);
    expect(byBed[2]).toBe(1100);
    expect(byBed[4]).toBe(1700);
    expect(out.every((r) => r.source === 'HUD_FMR' && r.period === '2025' && r.zip === '17101')).toBe(true);
  });

  it('falls back to MSA-level row when zip not in SAFMR list', () => {
    const basicdata = [
      { zip_code: 'MSA level', Efficiency: 700, 'One-Bedroom': 850, 'Two-Bedroom': 1000, 'Three-Bedroom': 1300, 'Four-Bedroom': 1600 },
    ];
    const out = parseHudBasicData('99999', basicdata, '2025');
    expect(Object.fromEntries(out.map((r) => [r.bedroom, r.fmr]))[1]).toBe(850);
  });
});

// ─── FRED ─────────────────────────────────────────────────────────────────────

describe('parseFredLatest', () => {
  it('extracts the most recent observation value', () => {
    const data = {
      observations: [
        { date: '2024-01-01', value: '6.87' },
        { date: '2024-02-01', value: '6.94' },
        { date: '2024-03-01', value: '.' }, // missing marker
      ],
    };
    const rec = parseFredLatest('MORTGAGE30US', 'US', data);
    expect(rec.metric).toBe('mortgage_rate_30y');
    expect(rec.value).toBeCloseTo(6.94);
    expect(rec.source).toBe('FRED');
    expect(rec.geo).toBe('US');
  });

  it('returns null when all observations are missing (.)', () => {
    const data = { observations: [{ date: '2024-01-01', value: '.' }] };
    const rec = parseFredLatest('MORTGAGE30US', 'US', data);
    expect(rec).toBeNull();
  });
});

// ─── BLS ──────────────────────────────────────────────────────────────────────

describe('parseBlsLatest', () => {
  it('extracts the latest period value from BLS JSON', () => {
    const data = {
      Results: {
        series: [
          {
            seriesID: 'LNS14000000',
            data: [
              { year: '2024', period: 'M03', value: '3.8', latest: 'false' },
              { year: '2024', period: 'M04', value: '3.9', latest: 'true' },
            ],
          },
        ],
      },
    };
    const rec = parseBlsLatest('LNS14000000', 'US', data);
    expect(rec.metric).toBe('unemployment_rate');
    expect(rec.value).toBeCloseTo(3.9);
    expect(rec.source).toBe('BLS');
    expect(rec.period).toBe('2024-M04');
  });

  it('returns null when series data is empty', () => {
    const data = { Results: { series: [{ seriesID: 'LNS14000000', data: [] }] } };
    const rec = parseBlsLatest('LNS14000000', 'US', data);
    expect(rec).toBeNull();
  });
});

// ─── Zillow ───────────────────────────────────────────────────────────────────

describe('parseZillowCsv', () => {
  it('extracts the latest month ZHVI for requested zips', () => {
    const csv = [
      'RegionID,SizeRank,RegionName,RegionType,StateName,2025-01-31,2025-02-28',
      '61639,1,17101,zip,PA,150000,152500',
      '61640,2,19103,zip,PA,420000,425000',
    ].join('\n');
    const out = parseZillowCsv(csv, ['17101']);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ geo: '17101', metric: 'zhvi', value: 152500, source: 'ZILLOW_ZHVI', period: '2025-02-28' });
  });

  it('skips rows with missing value for latest date', () => {
    const csv = [
      'RegionID,SizeRank,RegionName,RegionType,StateName,2025-01-31,2025-02-28',
      '61639,1,17101,zip,PA,150000,',
    ].join('\n');
    const out = parseZillowCsv(csv, ['17101']);
    expect(out).toHaveLength(0);
  });
});
