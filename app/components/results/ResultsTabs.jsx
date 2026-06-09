"use client";
import { motion } from "framer-motion";
import { Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn";
import { RESULT_TABS } from "../../lib/defaults";
import { residentialSensitivityCompute } from "../../lib/engine-adapter";
import { DealResults } from "./DealResults";
import { StressTestPanel } from "./StressTestPanel";
import { BrrrrPanel } from "./BrrrrPanel";
import { NeighborhoodPanel } from "./NeighborhoodPanel";
import { ProjectionsPanel } from "./ProjectionsPanel";
import { ScoreBreakdownChart } from "../charts/ScoreBreakdownChart";
import { SensitivityHeatmap } from "../charts/SensitivityHeatmap";

const TabStrip = ({ tabs, activeTab, onSelect, copied, onCopy }) => (
  <div className="flex items-center border-b border-paper-200 overflow-x-auto no-scrollbar">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onSelect(tab.id)}
        className={cn(
          "relative px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 whitespace-nowrap",
          activeTab === tab.id
            ? "text-forest-700"
            : "text-ink-400 hover:text-ink-600",
        )}
      >
        {tab.label}
        {activeTab === tab.id && (
          <motion.div
            layoutId="tab-underline"
            className="absolute bottom-0 left-3 right-3 h-[2px] bg-forest-700 rounded-full"
          />
        )}
      </button>
    ))}
    <div className="ml-auto flex items-center pr-4">
      <button
        type="button"
        onClick={onCopy}
        className="p-2 hover:bg-paper-50 rounded-full transition-colors flex items-center gap-1.5 text-ink-400 hover:text-forest-700 text-[11px] font-semibold uppercase tracking-[0.12em]"
      >
        {copied ? (
          <Check size={14} className="text-emerald-500" />
        ) : (
          <Copy size={14} />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  </div>
);

/**
 * The full results card: tab strip + the active tab's body. Stateless — the
 * parent owns activeTab, copy state, and all data. residentialOnly tabs are
 * hidden in commercial mode.
 */
export const ResultsTabs = ({
  mode,
  activeTab,
  onSelectTab,
  results,
  projections,
  residentialInputs,
  stressScenarios,
  brrrrResults,
  onInputChange,
  neighborhoodData,
  copied,
  onCopy,
}) => {
  const tabs = RESULT_TABS.filter(
    (t) => !t.residentialOnly || mode === "residential",
  );

  return (
    <div className="card-shell p-2 overflow-hidden">
      <div className="card-core overflow-hidden">
        <TabStrip
          tabs={tabs}
          activeTab={activeTab}
          onSelect={onSelectTab}
          copied={copied}
          onCopy={onCopy}
        />

        {activeTab === "deal" && (
          <div className="rise-in">
            <DealResults results={results} />
            {results.warnings?.length > 0 && (
              <div className="px-8 pb-6 space-y-1">
                {results.warnings.map((w, i) => (
                  <p
                    key={i}
                    className="text-xs text-amber-600 flex items-center gap-1"
                  >
                    <AlertCircle size={12} /> {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "charts" && (
          <div className="p-8 space-y-10 rise-in">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-5">
                Score Breakdown
              </h4>
              <ScoreBreakdownChart results={results} />
            </div>
            {mode === "residential" && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400 mb-5">
                  Levered IRR Sensitivity (Rate × Exit Cap)
                </h4>
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

        {activeTab === "stress" && mode === "residential" && (
          <div className="p-8 rise-in">
            <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">
              Stress-Test Battery
            </h4>
            <StressTestPanel scenarios={stressScenarios} />
          </div>
        )}

        {activeTab === "brrrr" && mode === "residential" && (
          <div className="p-8 rise-in">
            <h4 className="font-display text-lg font-medium text-ink-900 border-b border-paper-200 pb-3 mb-5">
              BRRRR / Refinance
            </h4>
            <BrrrrPanel
              inputs={residentialInputs}
              results={brrrrResults}
              onChange={onInputChange}
            />
          </div>
        )}

        {activeTab === "neighborhood" && mode === "residential" && (
          <NeighborhoodPanel data={neighborhoodData} />
        )}

        {activeTab === "projections" && (
          <ProjectionsPanel projections={projections} />
        )}
      </div>
    </div>
  );
};
