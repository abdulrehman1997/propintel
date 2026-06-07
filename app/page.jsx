'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Copy, Check, MapPin, Search, Loader2, AlertCircle, CheckCircle,
  TrendingUp, Clock, ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lib
import { cn } from './lib/cn';
import { formatCurrency, formatPercent } from './lib/format';
import {
  validateEngineInput,
  residentialStressTests,
  residentialSensitivityCompute,
  analyzeBrrrrDeal,
} from './lib/engine-adapter';

// Hooks
import { useDealAnalysis } from './hooks/useDealAnalysis';
import { useSavedDeals } from './hooks/useSavedDeals';

// Shell
import { AppHeader } from './components/shell/AppHeader';
import { AppFooter } from './components/shell/AppFooter';
import { ModeToggle } from './components/shell/ModeToggle';

// UI
import { Card } from './components/ui/Card';
import { Tooltip } from './components/ui/Tooltip';

// Inputs
import { ResidentialInputs } from './components/inputs/ResidentialInputs';
import { CommercialInputs } from './components/inputs/CommercialInputs';

// Results
import { DealResults } from './components/results/DealResults';
import { StressTestPanel } from './components/results/StressTestPanel';
import { BrrrrPanel } from './components/results/BrrrrPanel';

// Charts
import { ProjectionChart } from './components/charts/ProjectionChart';
import { ScoreBreakdownChart } from './components/charts/ScoreBreakdownChart';
import { SensitivityHeatmap } from './components/charts/SensitivityHeatmap';

// Compare + Persistence
import { CompareTable } from './components/compare/CompareTable';
import { SavedDealsPanel } from './components/persistence/SavedDealsPanel';

// ─── Default inputs ──────────────────────────────────────────────────────────

const DEFAULT_RESIDENTIAL = {
  purchasePrice: 350000,
  repairCosts: 0,
  downPaymentPct: 20,
  interestRate: 7.00,
  loanTermYears: 30,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyHOA: 0,
  monthlyRent: 2200,
  vacancyPct: 5,
  managementPct: 10,
  maintenancePct: 1,
  capExPct: 5,
  // projection & exit (previously hardcoded)
  holdYears: 5,
  appreciationPct: 3,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  exitCapRate: 0,
  saleCostPct: 6,
  // BRRRR / refi
  arv: 420000,
  rehabBudget: 0,
  rehabMonths: 0,
  hardMoneyRate: 0,
  refiLtv: 75,
  refiRate: 7,
  zipCode: '',
  bedrooms: 3,
};

const DEFAULT_COMMERCIAL = {
  assetType: 'multifamily',
  purchasePrice: 2000000,
  squareFeet: 12000,
  rentableSqft: 12000,
  units: [{ count: 8, marketRent: 2500, inPlaceRent: 2400 }],
  leaseType: 'gross',
  recoveryRatio: 0,
  vacancyPct: 5,
  creditLossPct: 1,
  otherIncomeAnnual: 0,
  opexAnnual: 96000,
  annualOperatingExpenses: 96000,
  goingInCapRate: 6,
  exitCapRate: 6.5,
  maxLTV: 75,
  minDSCR: 1.25,
  minDebtYield: 8,
  interestRate: 7,
  amortYears: 25,
  loanTermYears: 25,
  interestOnly: false,
  holdYears: 5,
  rentGrowthPct: 3,
  expenseGrowthPct: 3,
  saleCostPct: 2,
};

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState('residential');
  const [residentialInputs, setResidentialInputs] = useState(DEFAULT_RESIDENTIAL);
  const [commercialInputs, setCommercialInputs] = useState(DEFAULT_COMMERCIAL);
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState('deal');
  const [copied, setCopied] = useState(false);

  // Neighborhood state (residential only)
  const [loadingNeighborhood, setLoadingNeighborhood] = useState(false);
  const [neighborhoodData, setNeighborhoodData] = useState(null);
  const [neighborhoodError, setNeighborhoodError] = useState(null);

  // Compare panel
  const [compareDeals, setCompareDeals] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const inputs = mode === 'residential' ? residentialInputs : commercialInputs;
  const setInputs = mode === 'residential' ? setResidentialInputs : setCommercialInputs;

  // Engine
  const { results, projections } = useDealAnalysis(mode, inputs, neighborhoodData);

  // Persistence
  const { deals: savedDeals, save: saveToStorage, remove: removeFromStorage } = useSavedDeals();

  // ── Input change handler ──
  // String / array / boolean fields pass through untouched; numeric fields parse.
  const PASSTHROUGH_KEYS = ['zipCode', 'assetType', 'leaseType', 'units', 'interestOnly'];
  const handleInputChange = useCallback((key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: PASSTHROUGH_KEYS.includes(key) ? value : (parseFloat(value) || 0),
    }));
    // Clear error for this field on change
    setValidationErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [setInputs]);

  // ── Mode switch: reset validation errors ──
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setValidationErrors({});
    setNeighborhoodData(null);
    setNeighborhoodError(null);
  };

  // ── Neighborhood fetch ──
  const fetchNeighborhoodData = async () => {
    const zip = residentialInputs.zipCode;
    if (!zip || zip.length !== 5) {
      setNeighborhoodError('Please enter a valid 5-digit US zip code');
      return;
    }
    setLoadingNeighborhood(true);
    setNeighborhoodError(null);
    try {
      const res = await fetch(`/api/neighborhood?zip=${zip}&beds=${residentialInputs.bedrooms}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to fetch');
      setNeighborhoodData(data);
    } catch (err) {
      setNeighborhoodError(err.message);
      setNeighborhoodData(null);
    } finally {
      setLoadingNeighborhood(false);
    }
  };

  // ── Copy results ──
  const copyResults = () => {
    const text = `PropIntel Deal Summary:
Mode: ${mode}
Investment Grade: ${results.investmentGrade} (Score: ${Math.round(results.investmentScore)})
Cash Flow: ${formatCurrency(results.monthlyCashFlow)}/mo
Cash-on-Cash: ${formatPercent(results.cashOnCash)}
Cap Rate: ${formatPercent(results.capRate)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Validate before saving (engine zod schemas at the form boundary) ──
  const handleSaveDeal = (name) => {
    const validation = validateEngineInput(mode, inputs);
    if (!validation.success) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors({});
    const deal = { name, mode, inputs, results };
    const saved = saveToStorage(deal);
    // Add to compare list (max 4)
    setCompareDeals((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.find((d) => d.id === saved.id)) return prev;
      return [...prev, { ...saved, results }];
    });
  };

  const handleLoadDeal = (id) => {
    const deal = savedDeals.find((d) => d.id === id);
    if (!deal) return;
    setMode(deal.mode);
    if (deal.mode === 'residential') setResidentialInputs(deal.inputs);
    else setCommercialInputs(deal.inputs);
  };

  const handleDeleteDeal = (id) => {
    removeFromStorage(id);
    setCompareDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const removeFromCompare = (id) => setCompareDeals((prev) => prev.filter((d) => d.id !== id));

  // Stress-test battery + BRRRR (residential only) — driven by the real engine.
  const stressScenarios = useMemo(
    () => (mode === 'residential' ? residentialStressTests(residentialInputs) : []),
    [mode, residentialInputs],
  );
  const brrrrResults = useMemo(
    () => (mode === 'residential' ? analyzeBrrrrDeal(residentialInputs) : null),
    [mode, residentialInputs],
  );

  const TABS = [
    { id: 'deal', label: 'Deal Analysis' },
    { id: 'charts', label: 'Charts' },
    { id: 'stress', label: 'Stress Tests', residentialOnly: true },
    { id: 'brrrr', label: 'BRRRR', residentialOnly: true },
    { id: 'neighborhood', label: 'Neighborhood', residentialOnly: true },
    { id: 'projections', label: 'Projections' },
  ];

  return (
    <div className="min-h-screen bg-paper-50 text-ink-800 font-sans selection:bg-forest-100">
      <AppHeader />

      <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10 rise-in">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500 hover:text-forest-700 transition-colors duration-200 border border-paper-200 hover:border-forest-300 rounded-full px-4 py-2.5"
            >
              {showCompare ? 'Hide' : 'Compare'} ({compareDeals.length})
            </button>
          </div>
        </div>

        {/* Compare panel */}
        {showCompare && (
          <div className="mb-10 card-shell p-6 rise-in">
            <h2 className="font-display text-lg font-medium text-ink-900 mb-4">Deal Comparison</h2>
            <CompareTable deals={compareDeals} onRemove={removeFromCompare} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Input Panel ── */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8 rise-in">
            {mode === 'residential' ? (
              <ResidentialInputs
                inputs={residentialInputs}
                results={results}
                onChange={handleInputChange}
                errors={validationErrors}
              />
            ) : (
              <CommercialInputs
                inputs={commercialInputs}
                onChange={handleInputChange}
                errors={validationErrors}
              />
            )}

            {/* Location card — residential only */}
            {mode === 'residential' && (
              <Card title="Location" icon={MapPin}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="ZIP code"
                    placeholder="ZIP code"
                    maxLength={5}
                    value={residentialInputs.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 focus:border-forest-400 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={fetchNeighborhoodData}
                    disabled={loadingNeighborhood}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-forest-700 text-paper-50 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full hover:bg-forest-800 disabled:opacity-50 transition-all duration-200 hover:shadow-soft active:scale-[0.98]"
                  >
                    {loadingNeighborhood ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Analyze
                  </button>
                </div>
                {neighborhoodError && (
                  <p className="mt-2.5 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {neighborhoodError}
                  </p>
                )}
                {neighborhoodData && (
                  <p className="mt-2.5 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} /> {neighborhoodData.location?.city}, {neighborhoodData.location?.state}
                  </p>
                )}
              </Card>
            )}

            {/* Saved Deals */}
            <Card title="Saved Deals" icon={Clock}>
              <SavedDealsPanel
                deals={savedDeals}
                onSave={handleSaveDeal}
                onLoad={handleLoadDeal}
                onDelete={handleDeleteDeal}
              />
            </Card>
          </div>

          {/* ── Results Panel ── */}
          <div className="lg:col-span-7 rise-in">
            <div className="card-shell p-2 overflow-hidden">
             <div className="card-core overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center border-b border-paper-200 overflow-x-auto no-scrollbar">
                {TABS.filter((t) => !t.residentialOnly || mode === 'residential').map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 whitespace-nowrap',
                      activeTab === tab.id ? 'text-forest-700' : 'text-ink-400 hover:text-ink-600',
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-3 right-3 h-[2px] bg-forest-700 rounded-full" />
                    )}
                  </button>
                ))}
                <div className="ml-auto flex items-center pr-4">
                  <button
                    type="button"
                    onClick={copyResults}
                    className="p-2 hover:bg-paper-50 rounded-full transition-colors flex items-center gap-1.5 text-ink-400 hover:text-forest-700 text-[11px] font-semibold uppercase tracking-[0.12em]"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Deal Analysis Tab */}
              {activeTab === 'deal' && (
                <div className="rise-in">
                  <DealResults results={results} />
                  {results.warnings?.length > 0 && (
                    <div className="px-8 pb-6 space-y-1">
                      {results.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle size={12} /> {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Charts Tab */}
              {activeTab === 'charts' && (
                <div className="p-8 space-y-10 rise-in">
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-5">Score Breakdown</h4>
                    <ScoreBreakdownChart results={results} />
                  </div>
                  {mode === 'residential' && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-5">Levered IRR Sensitivity (Rate × Exit Cap)</h4>
                      <SensitivityHeatmap
                        baseInputs={residentialInputs}
                        compute={residentialSensitivityCompute}
                        baseCapRate={results?.capRate}
                        label="Levered IRR"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Stress Tests Tab */}
              {activeTab === 'stress' && mode === 'residential' && (
                <div className="p-8 rise-in">
                  <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">Stress-Test Battery</h4>
                  <StressTestPanel scenarios={stressScenarios} />
                </div>
              )}

              {/* BRRRR Tab */}
              {activeTab === 'brrrr' && mode === 'residential' && (
                <div className="p-8 rise-in">
                  <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">BRRRR / Refinance</h4>
                  <BrrrrPanel inputs={residentialInputs} results={brrrrResults} onChange={handleInputChange} />
                </div>
              )}

              {/* Neighborhood Tab */}
              {activeTab === 'neighborhood' && mode === 'residential' && (
                <div className="p-8 rise-in">
                  {!neighborhoodData ? (
                    <div className="text-center py-14">
                      <MapPin size={44} className="mx-auto text-paper-300 mb-4" strokeWidth={1.5} />
                      <h3 className="font-display text-xl font-medium text-ink-800">No Location Selected</h3>
                      <p className="text-ink-500 text-sm max-w-xs mx-auto mt-1">Enter a 5-digit zip code in the Location card to see neighborhood intelligence.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display text-xl font-medium text-ink-900">{[neighborhoodData.location?.city, neighborhoodData.location?.state].filter(Boolean).join(', ')}</h3>
                          <p className="text-ink-400 text-sm">{neighborhoodData.location?.zip}</p>
                        </div>
                        {(() => {
                          const c = neighborhoodData.census || {};
                          const fmr = neighborhoodData.fmr || {};
                          // The score defaults every sub-score to 50 when its input is
                          // null, so a "50" can appear with zero real data behind it.
                          // Only present a numeric score when at least one metric (incl.
                          // an FMR rent fallback) actually has data; otherwise show "—".
                          const hasData =
                            c.medianIncome != null || c.vacancyRate != null ||
                            c.unemploymentRate != null || c.medianRent != null ||
                            fmr.twoBed != null || fmr.oneBed != null || fmr.studio != null;
                          if (!hasData) {
                            return (
                              <div className="px-5 py-2.5 rounded-2xl font-display text-3xl font-light bg-paper-100 text-ink-400" title="No neighborhood data available for this ZIP">
                                —
                              </div>
                            );
                          }
                          const score = Math.round(neighborhoodData.neighborhoodScore);
                          return (
                            <div className={cn('px-5 py-2.5 rounded-2xl font-display text-3xl font-light', score >= 65 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                              {score}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Median Income', neighborhoodData.census?.medianIncome != null ? formatCurrency(neighborhoodData.census.medianIncome) : 'N/A'],
                          ['Vacancy Rate', neighborhoodData.census?.vacancyRate != null ? `${neighborhoodData.census.vacancyRate.toFixed(1)}%` : 'N/A'],
                          ['Unemployment', neighborhoodData.census?.unemploymentRate != null ? `${neighborhoodData.census.unemploymentRate.toFixed(1)}%` : 'N/A'],
                          // Median Rent: prefer Census median rent; fall back to HUD FMR
                          // (2BR, then 1BR, then studio) so seeded rent data is surfaced.
                          ['Median Rent', (() => {
                            const c = neighborhoodData.census || {};
                            const fmr = neighborhoodData.fmr || {};
                            const rent = c.medianRent ?? fmr.twoBed ?? fmr.oneBed ?? fmr.studio;
                            return rent != null ? formatCurrency(rent) : 'N/A';
                          })()],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-paper-50 border border-paper-200 rounded-2xl p-4">
                            <p className="text-ink-400 uppercase tracking-[0.14em] text-[10px] font-semibold mb-1.5">{label}</p>
                            <p className="font-display text-xl font-medium text-ink-900 tabular-nums">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Projections Tab */}
              {activeTab === 'projections' && (
                <div className="p-8 rise-in">
                  <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">5-Year Growth Forecast</h4>
                  <ProjectionChart projections={projections} />
                  <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-ink-400 uppercase text-[10px] tracking-[0.14em] font-semibold border-b border-paper-200">
                          <th className="py-2.5">Year</th>
                          <th className="py-2.5">Value</th>
                          <th className="py-2.5">Equity</th>
                          <th className="py-2.5 text-right">Cash Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-200 tabular-nums">
                        {projections.map((p) => (
                          <tr key={p.year} className="transition-colors hover:bg-paper-50">
                            <td className="py-3 font-display font-medium text-ink-900">{p.year}</td>
                            <td className="py-3 text-ink-700">{formatCurrency(p.propertyValue)}</td>
                            <td className="py-3 text-ink-700">{formatCurrency(p.equity)}</td>
                            <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(p.annualCashFlow)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
             </div>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
