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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between mb-8">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200 rounded-lg px-3 py-2"
            >
              {showCompare ? 'Hide' : 'Compare'} ({compareDeals.length})
            </button>
          </div>
        </div>

        {/* Compare panel */}
        {showCompare && (
          <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Deal Comparison</h2>
            <CompareTable deals={compareDeals} onRemove={removeFromCompare} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Input Panel ── */}
          <div className="lg:col-span-5 space-y-4">
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
                    placeholder="ZIP code"
                    maxLength={5}
                    value={residentialInputs.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={fetchNeighborhoodData}
                    disabled={loadingNeighborhood}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingNeighborhood ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Analyze
                  </button>
                </div>
                {neighborhoodError && (
                  <p className="mt-2 text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {neighborhoodError}
                  </p>
                )}
                {neighborhoodData && (
                  <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
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
          <div className="lg:col-span-7 sticky top-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-100 overflow-x-auto">
                {TABS.filter((t) => !t.residentialOnly || mode === 'residential').map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative px-5 py-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap',
                      activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </button>
                ))}
                <div className="ml-auto flex items-center pr-4">
                  <button
                    type="button"
                    onClick={copyResults}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-slate-400 hover:text-blue-600 text-xs font-semibold"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Deal Analysis Tab */}
              {activeTab === 'deal' && (
                <div className="animate-in fade-in duration-300">
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
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Score Breakdown</h4>
                    <ScoreBreakdownChart results={results} />
                  </div>
                  {mode === 'residential' && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Cash-on-Cash Sensitivity (Rate × Exit Cap)</h4>
                      <SensitivityHeatmap
                        baseInputs={residentialInputs}
                        compute={residentialSensitivityCompute}
                        label="CoC Return"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Stress Tests Tab */}
              {activeTab === 'stress' && mode === 'residential' && (
                <div className="p-8 animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Stress-Test Battery</h4>
                  <StressTestPanel scenarios={stressScenarios} />
                </div>
              )}

              {/* BRRRR Tab */}
              {activeTab === 'brrrr' && mode === 'residential' && (
                <div className="p-8 animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">BRRRR / Refinance</h4>
                  <BrrrrPanel inputs={residentialInputs} results={brrrrResults} onChange={handleInputChange} />
                </div>
              )}

              {/* Neighborhood Tab */}
              {activeTab === 'neighborhood' && mode === 'residential' && (
                <div className="p-8 animate-in slide-in-from-right duration-300">
                  {!neighborhoodData ? (
                    <div className="text-center py-12">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <h3 className="text-lg font-bold text-slate-800">No Location Selected</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">Enter a 5-digit zip code in the Location card to see neighborhood intelligence.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{neighborhoodData.location?.city}, {neighborhoodData.location?.state}</h3>
                          <p className="text-slate-400 text-sm">{neighborhoodData.location?.zip}</p>
                        </div>
                        <div className={cn('px-4 py-2 rounded-xl text-2xl font-black', Math.round(neighborhoodData.neighborhoodScore) >= 65 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                          {Math.round(neighborhoodData.neighborhoodScore)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Median Income</p>
                          <p className="font-bold text-slate-800">{formatCurrency(neighborhoodData.census?.medianIncome)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Vacancy Rate</p>
                          <p className="font-bold text-slate-800">{neighborhoodData.census?.vacancyRate?.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Unemployment</p>
                          <p className="font-bold text-slate-800">{neighborhoodData.census?.unemploymentRate?.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Median Rent</p>
                          <p className="font-bold text-slate-800">{formatCurrency(neighborhoodData.census?.medianRent)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Projections Tab */}
              {activeTab === 'projections' && (
                <div className="p-8 animate-in slide-in-from-right duration-300">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">5-Year Growth Forecast</h4>
                  <ProjectionChart projections={projections} />
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase font-bold border-b border-slate-100">
                          <th className="py-2">Year</th>
                          <th className="py-2">Value</th>
                          <th className="py-2">Equity</th>
                          <th className="py-2 text-right">Cash Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {projections.map((p) => (
                          <tr key={p.year}>
                            <td className="py-3 font-semibold">{p.year}</td>
                            <td className="py-3">{formatCurrency(p.propertyValue)}</td>
                            <td className="py-3">{formatCurrency(p.equity)}</td>
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
      </main>

      <AppFooter />
    </div>
  );
}
