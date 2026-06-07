'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { calculateMetrics, calculateProjections } from '../lib/calculations';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Home, 
  Clock, 
  ShieldCheck, 
  Briefcase, 
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DEFAULT_INPUTS = {
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
  zipCode: '',
  bedrooms: 3
};

const formatCurrency = (val) => {
  if (val === null || val === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: val < 100 ? 2 : 0,
  }).format(val);
};

const formatPercent = (val) => {
  if (val === null || val === undefined) return 'N/A';
  return `${val.toFixed(2)}%`;
};

const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Info size={14} />
      </div>
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InputGroup = ({ label, children, tooltip }) => (
  <div className="mb-4">
    <label className="flex items-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
      {label}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
    {children}
  </div>
);

const Card = ({ title, children, defaultOpen = true, icon: Icon, id }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4 transition-all hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="text-slate-400" size={18} />}
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetricCard = ({ label, value, tooltip, benchmark, format = 'currency' }) => {
  const { green, red } = benchmark;
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;
  
  let colorClass = "text-amber-500";
  if (format === 'percent_pass') {
    colorClass = value.includes('PASS') ? "text-emerald-500" : "text-rose-500";
  } else if (numValue !== null) {
    if (numValue > green) colorClass = "text-emerald-500";
    else if (numValue < red) colorClass = "text-rose-500";
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className={cn("text-xl md:text-2xl font-bold tabular-nums", colorClass)}>
        {value}
      </div>
    </div>
  );
};

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('deal');
  const [loadingNeighborhood, setLoadingNeighborhood] = useState(false);
  const [neighborhoodData, setNeighborhoodData] = useState(null);
  const [neighborhoodError, setNeighborhoodError] = useState(null);

  const results = useMemo(() => {
    const metrics = calculateMetrics(inputs);
    
    // Session 2 Score blending
    if (neighborhoodData) {
      const { cocScore, capScore, grmScore, onePercScore } = metrics;
      const neighborhoodScore = neighborhoodData.neighborhoodScore;
      
      const combinedScore = 
        (cocScore * 0.35) + 
        (capScore * 0.25) + 
        (grmScore * 0.15) + 
        (onePercScore * 0.10) + 
        (neighborhoodScore * 0.15);
      
      let grade = 'F';
      if (combinedScore >= 80) grade = 'A';
      else if (combinedScore >= 65) grade = 'B';
      else if (combinedScore >= 50) grade = 'C';
      else if (combinedScore >= 35) grade = 'D';

      return { ...metrics, investmentScore: combinedScore, investmentGrade: grade, blended: true };
    }
    
    return metrics;
  }, [inputs, neighborhoodData]);

  const projections = useMemo(() => calculateProjections(inputs, results), [inputs, results]);

  const handleInputChange = (key, value) => {
    setInputs(prev => ({
      ...prev,
      [key]: (key === 'zipCode') ? value : (parseFloat(value) || 0)
    }));
  };

  const fetchNeighborhoodData = async () => {
    const zip = inputs.zipCode;
    if (!zip || zip.length !== 5) {
      setNeighborhoodError('Please enter a valid 5-digit US zip code');
      return;
    }

    setLoadingNeighborhood(true);
    setNeighborhoodError(null);

    try {
      const response = await fetch(`/api/neighborhood?zip=${zip}&beds=${inputs.bedrooms}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch neighborhood data');
      }

      setNeighborhoodData(data);
    } catch (err) {
      setNeighborhoodError(err.message);
      setNeighborhoodData(null);
    } finally {
      setLoadingNeighborhood(false);
    }
  };

  const copyResults = () => {
    const text = `PropIntel Deal Summary:
Location: ${neighborhoodData ? `${neighborhoodData.location.city}, ${neighborhoodData.location.state} ${neighborhoodData.location.zip}` : 'N/A'}
Investment Grade: ${results.investmentGrade} (Score: ${Math.round(results.investmentScore)})
Cash Flow: ${formatCurrency(results.monthlyCashFlow)}/mo
Cash-on-Cash: ${formatPercent(results.cashOnCash)}
Cap Rate: ${formatPercent(results.capRate)}
ROI: ${formatPercent(results.annualROI)}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 65) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (score >= 35) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-[#0F172A] text-white py-12 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="PropIntel Logo" className="w-12 h-12 rounded-lg bg-white p-1" />
                <h1 className="text-3xl font-bold tracking-tight">PropIntel</h1>
              </div>
              <p className="text-slate-400 text-lg">"Know your numbers before you make an offer."</p>
              <p className="text-slate-500 text-sm mt-1">Real estate investment analyzer for individual investors</p>
            </div>
          </motion.div>
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Input Panel */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Location Card */}
            <Card title="Location" icon={MapPin} defaultOpen={true} id="location-card">
              <div className="space-y-4">
                <InputGroup label="Zip Code">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        maxLength={5}
                        placeholder="90210"
                        value={inputs.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && fetchNeighborhoodData()}
                        className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tabular-nums font-semibold"
                      />
                      {loadingNeighborhood && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-blue-600" size={18} />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={fetchNeighborhoodData}
                      disabled={loadingNeighborhood || inputs.zipCode.length !== 5}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Search size={18} />
                      Search
                    </button>
                  </div>
                  {neighborhoodData && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={16} className="text-emerald-600" />
                            <div className="text-sm font-bold text-emerald-900">
                              {neighborhoodData.location.city}, {neighborhoodData.location.state}
                            </div>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">
                            Neighborhood Score: {neighborhoodData.neighborhoodScore}/100
                          </div>
                          {neighborhoodData.censusError && (
                            <div className="mt-1 text-[10px] text-amber-600 font-medium italic">
                              ⚠ {neighborhoodData.censusError}
                            </div>
                          )}
                        </div>
                        <div className={cn("px-3 py-1 rounded-lg text-lg font-black shadow-sm", getScoreColor(neighborhoodData.neighborhoodScore))}>
                          {neighborhoodData.neighborhoodScore >= 80 ? 'A' : neighborhoodData.neighborhoodScore >= 65 ? 'B' : neighborhoodData.neighborhoodScore >= 50 ? 'C' : 'D'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {neighborhoodError && (
                    <div className="flex items-center gap-2 mt-2 text-rose-600 text-xs font-medium">
                      <AlertCircle size={14} />
                      {neighborhoodError}
                    </div>
                  )}
                </InputGroup>
              </div>
            </Card>

            <Card title="Property & Purchase" icon={Home} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <InputGroup label="Purchase Price">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={inputs.purchasePrice}
                        onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                        className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tabular-nums"
                      />
                    </div>
                  </InputGroup>
                </div>

                <InputGroup label="Bedrooms">
                  <select 
                    value={inputs.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value={0}>Studio</option>
                    <option value={1}>1 BR</option>
                    <option value={2}>2 BR</option>
                    <option value={3}>3 BR</option>
                    <option value={4}>4 BR</option>
                  </select>
                </InputGroup>

                <InputGroup label="Repair Costs">
                   <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={inputs.repairCosts}
                      onChange={(e) => handleInputChange('repairCosts', e.target.value)}
                      className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </InputGroup>

                <div className="col-span-2">
                  <InputGroup label={`Down Payment: ${inputs.downPaymentPct}% (${formatCurrency(results.downPaymentDollar)})`}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={inputs.downPaymentPct}
                      onChange={(e) => handleInputChange('downPaymentPct', e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex justify-between gap-1">
                      {[3.5, 5, 10, 20, 25].map(pct => (
                        <button key={pct} onClick={() => handleInputChange('downPaymentPct', pct)} className={cn("flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all border", inputs.downPaymentPct === pct ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>{pct}%</button>
                      ))}
                    </div>
                  </InputGroup>
                </div>

                <InputGroup label="Interest Rate">
                  <div className="relative">
                    <input 
                      type="number" step="0.01" value={inputs.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      className="w-full pl-4 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                  </div>
                </InputGroup>

                <InputGroup label="Loan Term">
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    {[15, 20, 30].map(term => (
                      <button key={term} onClick={() => handleInputChange('loanTermYears', term)} className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-all", inputs.loanTermYears === term ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{term}yr</button>
                    ))}
                  </div>
                </InputGroup>
              </div>
            </Card>

            <Card title="Rental Income" icon={DollarSign} defaultOpen={true}>
              <div className="space-y-4">
                <InputGroup label="Monthly Rent">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={inputs.monthlyRent}
                      onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                      className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg font-bold"
                    />
                  </div>
                  
                  {/* Rent Suggestion Chips */}
                  {neighborhoodData && (
                    <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Market Benchmarks ({neighborhoodData.location.city})
                        {neighborhoodData.census.medianRent && <span className="text-slate-500">Median: {formatCurrency(neighborhoodData.census.medianRent)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Studio', key: 'studio', beds: 0 },
                          { label: '1BR', key: 'oneBed', beds: 1 },
                          { label: '2BR', key: 'twoBed', beds: 2 },
                          { label: '3BR', key: 'threeBed', beds: 3 },
                          { label: '4BR', key: 'fourBed', beds: 4 },
                        ].map(item => {
                          const fmrVal = neighborhoodData.fmr[item.key];
                          if (!fmrVal) return null;
                          const isActive = inputs.bedrooms === item.beds;
                          return (
                            <button 
                              key={item.key}
                              onClick={() => handleInputChange('monthlyRent', fmrVal)}
                              className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold transition-all border flex flex-col items-center min-w-[50px]",
                                isActive ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-blue-100 text-blue-700 hover:bg-blue-100"
                              )}
                            >
                              <span>{item.label}</span>
                              <span>{formatCurrency(fmrVal)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-[9px] text-slate-400 italic">Source: HUD Fair Market Rents 2025</div>
                    </div>
                  )}
                </InputGroup>

                <InputGroup label={`Vacancy Rate: ${inputs.vacancyPct}%`}>
                  <input type="range" min="0" max="20" step="0.5" value={inputs.vacancyPct} onChange={(e) => handleInputChange('vacancyPct', e.target.value)} />
                </InputGroup>

                <InputGroup label={`Management Fee: ${inputs.managementPct}%`}>
                  <input type="range" min="0" max="15" step="0.5" value={inputs.managementPct} onChange={(e) => handleInputChange('managementPct', e.target.value)} />
                </InputGroup>
              </div>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7 sticky top-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {[
                  { id: 'deal', label: 'Deal Analysis' },
                  { id: 'neighborhood', label: 'Neighborhood' },
                  { id: 'projections', label: '5-Year Projection' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all relative",
                      activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                  </button>
                ))}
              </div>

              {activeTab === 'deal' && (
                <div className="animate-in fade-in duration-300">
                   <div className="p-8 text-center border-b border-slate-50 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-left">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Investment Analysis</h2>
                        <p className="text-slate-500 text-xs">Based on current assumptions</p>
                      </div>
                      <button onClick={copyResults} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 flex items-center gap-2 text-slate-500 hover:text-blue-600">
                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                        <span className="text-xs font-semibold">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col items-center">
                      <motion.div 
                        key={results.investmentGrade} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className={cn("w-24 h-24 rounded-full flex items-center justify-center text-5xl font-black mb-4 shadow-lg border-4", getScoreColor(results.investmentScore))}
                      >
                        {results.investmentGrade}
                      </motion.div>
                      <div className="text-2xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                        Score: {Math.round(results.investmentScore)} / 100
                        {results.blended && <Tooltip text="Score includes neighborhood context factors (income, vacancy, employment)." />}
                      </div>
                      <div className="text-slate-500 font-medium">
                        {results.investmentGrade === 'A' && "Strong deal — excellent cash flow and returns"}
                        {results.investmentGrade === 'B' && "Good deal — solid fundamentals"}
                        {results.investmentGrade === 'C' && "Marginal deal — thin margins, review assumptions"}
                        {results.investmentGrade === 'D' && "Weak deal — negative or near-zero returns"}
                        {results.investmentGrade === 'F' && "Avoid — this deal loses money"}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard label="Monthly Cash Flow" value={formatCurrency(results.monthlyCashFlow)} benchmark={{ green: 200, red: 0 }} />
                    <MetricCard label="CoC Return" value={formatPercent(results.cashOnCash)} benchmark={{ green: 6, red: 0 }} />
                    <MetricCard label="Cap Rate" value={formatPercent(results.capRate)} benchmark={{ green: 5, red: 3 }} />
                    <MetricCard label="GRM" value={results.GRM.toFixed(1)} benchmark={{ green: -12, red: -20 }} />
                    <MetricCard label="1% Rule" value={results.onePercentRule >= 1 ? '✅ PASS' : '❌ FAIL'} benchmark={{ green: 1.0, red: 0.7 }} format="percent_pass" />
                    <MetricCard label="Annual ROI" value={formatPercent(results.annualROI)} benchmark={{ green: 8, red: 2 }} />
                  </div>
                </div>
              )}

              {activeTab === 'neighborhood' && (
                <div className="p-8 animate-in slide-in-from-right duration-300">
                  {!neighborhoodData ? (
                    <div className="text-center py-12">
                      <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
                      <h3 className="text-lg font-bold text-slate-800">No Location Selected</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">Enter a 5-digit zip code in the Location card to see neighborhood intelligence.</p>
                      <button onClick={() => document.getElementById('location-card')?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 text-blue-600 font-bold text-sm">Scroll to Search</button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Neighborhood Header */}
                      <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{neighborhoodData.location.city}, {neighborhoodData.location.stateCode} {neighborhoodData.location.zip}</h3>
                          <p className="text-slate-500 text-xs">Market Context Analysis</p>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Neighborhood Score</div>
                          <div className={cn("px-4 py-2 rounded-xl text-2xl font-black", getScoreColor(neighborhoodData.neighborhoodScore))}>
                            {neighborhoodData.neighborhoodScore}
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown Bars */}
                      <section>
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Investment Climate Breakdown</h4>
                         <div className="space-y-4">
                           {[
                             { label: 'Income Quality', score: neighborhoodData.scoreBreakdown.incomeScore },
                             { label: 'Vacancy Health', score: neighborhoodData.scoreBreakdown.vacancyScore },
                             { label: 'Employment Strength', score: neighborhoodData.scoreBreakdown.unemploymentScore },
                             { label: 'LTR Suitability', score: neighborhoodData.scoreBreakdown.priceToRentScore },
                           ].map((item, idx) => (
                             <div key={idx}>
                               <div className="flex justify-between text-xs font-semibold mb-1">
                                 <span>{item.label}</span>
                                 <span>{Math.round(item.score)}/100</span>
                               </div>
                               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${item.score}%` }}
                                   className={cn(
                                     "h-full rounded-full transition-all duration-1000",
                                     item.score >= 70 ? "bg-emerald-500" : item.score >= 40 ? "bg-amber-500" : "bg-rose-500"
                                   )}
                                 />
                               </div>
                             </div>
                           ))}
                         </div>
                      </section>

                      {/* Fundamentals Grid */}
                      <section className="grid grid-cols-2 gap-4">
                         <div className="p-4 border border-slate-100 rounded-xl">
                           <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Median Home Value</div>
                           <div className="text-lg font-bold">{formatCurrency(neighborhoodData.census.medianHomeValue)}</div>
                           <div className="text-[9px] text-slate-500 mt-1">Source: Census ACS</div>
                         </div>
                         <div className="p-4 border border-slate-100 rounded-xl">
                           <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Median Rent</div>
                           <div className="text-lg font-bold">{formatCurrency(neighborhoodData.census.medianRent)}/mo</div>
                           <div className="text-[9px] text-slate-500 mt-1">Source: Census ACS</div>
                         </div>
                         <div className="p-4 border border-slate-100 rounded-xl">
                           <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Price-to-Rent</div>
                           <div className="text-lg font-bold">{neighborhoodData.census.priceToRentRatio?.toFixed(1)}</div>
                           <div className="text-[9px] text-slate-500 mt-1">{neighborhoodData.census.priceToRentRatio > 20 ? '🔥 Appreciation Play' : '💰 Cash Flow Play'}</div>
                         </div>
                         <div className="p-4 border border-slate-100 rounded-xl">
                           <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vacancy Rate</div>
                           <div className="text-lg font-bold">{formatPercent(neighborhoodData.census.vacancyRate)}</div>
                           <div className="text-[9px] text-slate-500 mt-1">{neighborhoodData.census.vacancyRate < 5 ? '🟢 High Demand' : '🟡 Balanced'}</div>
                         </div>
                      </section>

                      {/* Indicators */}
                      <section className="space-y-3 p-4 bg-slate-50 rounded-xl">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Market Indicators</h4>
                         <div className="flex items-center gap-3 text-xs">
                           <div className={cn("w-2 h-2 rounded-full", neighborhoodData.census.priceToRentRatio > 25 ? 'bg-rose-500' : 'bg-emerald-500')} />
                           <span className="font-medium">Price-to-Rent Ratio: {neighborhoodData.census.priceToRentRatio?.toFixed(1)}</span>
                           <span className="text-slate-400">→ {neighborhoodData.census.priceToRentRatio > 20 ? 'Appreciation/STR focus' : 'LTR friendly'}</span>
                         </div>
                         <div className="flex items-center gap-3 text-xs">
                           <div className={cn("w-2 h-2 rounded-full", neighborhoodData.census.vacancyRate < 7 ? 'bg-emerald-500' : 'bg-amber-500')} />
                           <span className="font-medium">Vacancy Rate: {formatPercent(neighborhoodData.census.vacancyRate)}</span>
                           <span className="text-slate-400">→ {neighborhoodData.census.vacancyRate < 5 ? 'Strong rental demand' : 'Moderate supply'}</span>
                         </div>
                         <div className="flex items-center gap-3 text-xs">
                           <div className={cn("w-2 h-2 rounded-full", neighborhoodData.census.unemploymentRate < 5 ? 'bg-emerald-500' : 'bg-rose-500')} />
                           <span className="font-medium">Unemployment: {formatPercent(neighborhoodData.census.unemploymentRate)}</span>
                           <span className="text-slate-400">→ {neighborhoodData.census.unemploymentRate < 4 ? 'Solid local economy' : 'Economic risk'}</span>
                         </div>
                      </section>

                      <footer className="text-[10px] text-slate-400 italic">
                        Data sources: US Census ACS 5-Year (2022) · HUD Fair Market Rents (FY2025). 
                        HUD FMRs represent 40th-percentile rents. Market rates typically run higher.
                      </footer>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'projections' && (
                <div className="p-8 animate-in slide-in-from-right duration-300">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">5-Year Growth Forecast</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase font-bold border-b border-slate-100">
                          <th className="py-2">Year</th>
                          <th className="py-2">Value</th>
                          <th className="py-2">Equity</th>
                          <th className="py-2">Cash Flow</th>
                          <th className="py-2 text-right">Ann. Return</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {projections.map((p) => (
                          <tr key={p.year}>
                            <td className="py-3 font-semibold">{p.year}</td>
                            <td className="py-3">{formatCurrency(p.propertyValue)}</td>
                            <td className="py-3">{formatCurrency(p.equity)}</td>
                            <td className="py-3">{formatCurrency(p.annualCashFlow)}</td>
                            <td className="py-3 text-right font-medium text-emerald-600">+{formatCurrency(p.totalReturn)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4 italic">*Assumes 3% annual appreciation, 3% rent growth, and 3% expense inflation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 px-6 mt-12 text-center">
        <div className="max-w-6xl mx-auto text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
                <TrendingUp size={14} className="text-white" />
              </div>
            <span className="font-bold text-slate-800">PropIntel</span>
          </div>
          <p className="text-sm">Professional Real Estate Analysis for the Individual Investor.</p>
          <p className="text-[10px] mt-8 uppercase tracking-widest">&copy; 2026 PropIntel Systems. Built with Antigravity.</p>
        </div>
      </footer>
    </div>
  );
}
