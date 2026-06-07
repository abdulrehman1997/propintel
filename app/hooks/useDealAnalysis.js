'use client';
import { useMemo } from 'react';
import {
  analyzeResidentialDeal,
  analyzeCommercialDeal,
  gradeFor,
} from '../lib/engine-adapter';

/**
 * Runs the modular pro-grade engine via the engine adapter:
 *  - residential → lib/residential.js (analyzeResidential + projectResidential)
 *  - commercial  → lib/commercial.js  (analyzeCommercial + projectCommercial)
 * plus lib/scoring.js for composite score, grade, and red-flag gates.
 *
 * For residential deals, an optional neighborhood score is blended into the
 * composite investment score (70% deal / 30% neighborhood).
 *
 * Returns { results, projections } where projections is the per-year series.
 */
export function useDealAnalysis(mode, inputs, neighborhoodData) {
  return useMemo(() => {
    const analyzed = mode === 'residential'
      ? analyzeResidentialDeal(inputs)
      : analyzeCommercialDeal(inputs);

    let results = analyzed;
    if (mode === 'residential' && neighborhoodData?.neighborhoodScore != null) {
      const nbScore = neighborhoodData.neighborhoodScore;
      const blendedScore = analyzed.investmentScore * 0.7 + nbScore * 0.3;
      results = {
        ...analyzed,
        investmentScore: blendedScore,
        investmentGrade: gradeFor(blendedScore),
        blended: true,
      };
    }

    return { results, projections: analyzed.projections ?? [] };
  }, [mode, inputs, neighborhoodData]);
}
