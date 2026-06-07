"use client";

import { useState, useCallback, useMemo } from "react";
import { Clock } from "lucide-react";

// Lib
import { formatCurrency, formatPercent } from "./lib/format";
import {
  validateEngineInput,
  residentialStressTests,
  analyzeBrrrrDeal,
} from "./lib/engine-adapter";
import { DEFAULT_RESIDENTIAL, DEFAULT_COMMERCIAL } from "./lib/defaults";

// Hooks
import { useDealAnalysis } from "./hooks/useDealAnalysis";
import { useSavedDeals } from "./hooks/useSavedDeals";

// Shell
import { AppHeader } from "./components/shell/AppHeader";
import { AppFooter } from "./components/shell/AppFooter";
import { ModeToggle } from "./components/shell/ModeToggle";

// UI
import { Card } from "./components/ui/Card";

// Inputs
import { ResidentialInputs } from "./components/inputs/ResidentialInputs";
import { CommercialInputs } from "./components/inputs/CommercialInputs";
import { LocationCard } from "./components/inputs/LocationCard";

// Results + Compare + Persistence
import { ResultsTabs } from "./components/results/ResultsTabs";
import { CompareTable } from "./components/compare/CompareTable";
import { SavedDealsPanel } from "./components/persistence/SavedDealsPanel";

// String / array / boolean fields pass through untouched; numeric fields parse.
const PASSTHROUGH_KEYS = [
  "zipCode",
  "assetType",
  "leaseType",
  "units",
  "interestOnly",
];

export default function App() {
  const [mode, setMode] = useState("residential");
  const [residentialInputs, setResidentialInputs] =
    useState(DEFAULT_RESIDENTIAL);
  const [commercialInputs, setCommercialInputs] = useState(DEFAULT_COMMERCIAL);
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTab, setActiveTab] = useState("deal");
  const [copied, setCopied] = useState(false);

  // Neighborhood state (residential only)
  const [loadingNeighborhood, setLoadingNeighborhood] = useState(false);
  const [neighborhoodData, setNeighborhoodData] = useState(null);
  const [neighborhoodError, setNeighborhoodError] = useState(null);

  // Compare panel
  const [compareDeals, setCompareDeals] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const inputs = mode === "residential" ? residentialInputs : commercialInputs;
  const setInputs =
    mode === "residential" ? setResidentialInputs : setCommercialInputs;

  // Engine
  const { results, projections } = useDealAnalysis(
    mode,
    inputs,
    neighborhoodData,
  );

  // Persistence
  const {
    deals: savedDeals,
    save: saveToStorage,
    remove: removeFromStorage,
  } = useSavedDeals();

  // ── Input change handler ──
  const handleInputChange = useCallback(
    (key, value) => {
      setInputs((prev) => ({
        ...prev,
        [key]: PASSTHROUGH_KEYS.includes(key) ? value : parseFloat(value) || 0,
      }));
      // Clear error for this field on change
      setValidationErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setInputs],
  );

  // ── Mode switch: reset validation errors + neighborhood ──
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
      setNeighborhoodError("Please enter a valid 5-digit US zip code");
      return;
    }
    setLoadingNeighborhood(true);
    setNeighborhoodError(null);
    try {
      const res = await fetch(
        `/api/neighborhood?zip=${zip}&beds=${residentialInputs.bedrooms}`,
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.details || data.error || "Failed to fetch");
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
    if (deal.mode === "residential") setResidentialInputs(deal.inputs);
    else setCommercialInputs(deal.inputs);
  };

  const handleDeleteDeal = (id) => {
    removeFromStorage(id);
    setCompareDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const removeFromCompare = (id) =>
    setCompareDeals((prev) => prev.filter((d) => d.id !== id));

  // Stress-test battery + BRRRR (residential only) — driven by the real engine.
  const stressScenarios = useMemo(
    () =>
      mode === "residential" ? residentialStressTests(residentialInputs) : [],
    [mode, residentialInputs],
  );
  const brrrrResults = useMemo(
    () => (mode === "residential" ? analyzeBrrrrDeal(residentialInputs) : null),
    [mode, residentialInputs],
  );

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
              {showCompare ? "Hide" : "Compare"} ({compareDeals.length})
            </button>
          </div>
        </div>

        {/* Compare panel */}
        {showCompare && (
          <div className="mb-10 card-shell p-6 rise-in">
            <h2 className="font-display text-lg font-medium text-ink-900 mb-4">
              Deal Comparison
            </h2>
            <CompareTable deals={compareDeals} onRemove={removeFromCompare} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Input Panel ── */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8 rise-in">
            {mode === "residential" ? (
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
            {mode === "residential" && (
              <LocationCard
                zipCode={residentialInputs.zipCode}
                onChange={handleInputChange}
                onFetch={fetchNeighborhoodData}
                loading={loadingNeighborhood}
                error={neighborhoodError}
                data={neighborhoodData}
              />
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
            <ResultsTabs
              mode={mode}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              results={results}
              projections={projections}
              residentialInputs={residentialInputs}
              stressScenarios={stressScenarios}
              brrrrResults={brrrrResults}
              onInputChange={handleInputChange}
              neighborhoodData={neighborhoodData}
              copied={copied}
              onCopy={copyResults}
            />
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
