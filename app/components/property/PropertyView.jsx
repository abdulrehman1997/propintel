// app/components/property/PropertyView.jsx
"use client";
import { useState, useCallback, useMemo } from "react";
import { useDealAnalysis } from "../../hooks/useDealAnalysis";
import {
  residentialStressTests,
  analyzeBrrrrDeal,
} from "../../lib/engine-adapter";
import { formatCurrency, formatPercent } from "../../lib/format";
import { ResidentialInputs } from "../inputs/ResidentialInputs";
import { ResultsTabs } from "../results/ResultsTabs";

const PASSTHROUGH_KEYS = ["zipCode", "bedrooms"];

export function PropertyView({ initialInputs, neighborhoodData = null }) {
  const [inputs, setInputs] = useState(initialInputs);
  const [showInputs, setShowInputs] = useState(false);
  const [activeTab, setActiveTab] = useState("deal");
  const [copied, setCopied] = useState(false);

  const { results, projections } = useDealAnalysis(
    "residential",
    inputs,
    neighborhoodData,
  );

  const handleInputChange = useCallback((key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: PASSTHROUGH_KEYS.includes(key) ? value : parseFloat(value) || 0,
    }));
  }, []);

  const copyResults = () => {
    navigator.clipboard?.writeText(
      `PropIntel — Grade ${results.investmentGrade} (${Math.round(results.investmentScore)}), ` +
        `CF ${formatCurrency(results.monthlyCashFlow)}/mo, CoC ${formatPercent(results.cashOnCash)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stressScenarios = useMemo(
    () => residentialStressTests(inputs),
    [inputs],
  );
  const brrrrResults = useMemo(() => analyzeBrrrrDeal(inputs), [inputs]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowInputs((v) => !v)}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500 hover:text-forest-700 border border-paper-200 hover:border-forest-300 rounded-full px-4 py-2.5"
        >
          {showInputs ? "Hide inputs" : "Customize"}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {showInputs && (
          <div className="lg:col-span-5 space-y-4">
            <ResidentialInputs
              inputs={inputs}
              results={results}
              onChange={handleInputChange}
              errors={{}}
            />
          </div>
        )}
        <div className={showInputs ? "lg:col-span-7" : "lg:col-span-12"}>
          <ResultsTabs
            mode="residential"
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            results={results}
            projections={projections}
            residentialInputs={inputs}
            stressScenarios={stressScenarios}
            brrrrResults={brrrrResults}
            onInputChange={handleInputChange}
            neighborhoodData={neighborhoodData}
            copied={copied}
            onCopy={copyResults}
          />
        </div>
      </div>
    </div>
  );
}
