'use client';
import { cn } from '../../lib/cn';
import { InputGroup } from '../ui/InputGroup';
import { Building2, DollarSign, Percent, Banknote, TrendingUp } from 'lucide-react';

const inputCls = 'w-full px-4 py-2.5 bg-paper-50 border border-paper-200 rounded-xl focus:ring-2 focus:ring-forest-300 focus:border-forest-400 outline-none transition-colors duration-200 tabular-nums text-sm text-ink-900';

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-rose-500 mt-1">{message}</p> : null;

const Money = ({ value, onChange, error }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
    <input
      type="number"
      value={value}
      onChange={onChange}
      className={cn(inputCls, 'pl-7', error && 'border-rose-400')}
    />
  </div>
);

const Pct = ({ value, onChange, step = '0.1' }) => (
  <div className="relative">
    <input type="number" step={step} value={value} onChange={onChange} className={cn(inputCls, 'pr-7')} />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
  </div>
);

const SectionTitle = ({ icon: Icon, children }) => (
  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
    <Icon size={12} /> {children}
  </h3>
);

export const CommercialInputs = ({ inputs, onChange, errors = {} }) => {
  const handle = (key, value) => onChange(key, value);
  const assetType = inputs.assetType || 'multifamily';
  const isMultifamily = assetType === 'multifamily';
  const units = Array.isArray(inputs.units) ? inputs.units : [];

  const updateUnit = (idx, key, value) => {
    const next = units.map((u, i) => (i === idx ? { ...u, [key]: value } : u));
    onChange('units', next);
  };
  const addUnit = () => onChange('units', [...units, { count: 1, marketRent: 1500, inPlaceRent: 1450 }]);
  const removeUnit = (idx) => onChange('units', units.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={Building2}>Property</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputGroup label="Asset Type">
              <select
                value={assetType}
                onChange={(e) => handle('assetType', e.target.value)}
                className={inputCls}
              >
                <option value="multifamily">Multifamily</option>
                <option value="retail">Retail</option>
                <option value="office">Office</option>
                <option value="industrial">Industrial</option>
              </select>
            </InputGroup>
          </div>

          <div className="col-span-2">
            <InputGroup label="Purchase Price">
              <Money value={inputs.purchasePrice} onChange={(e) => handle('purchasePrice', e.target.value)} error={errors.purchasePrice} />
              <FieldError message={errors.purchasePrice} />
            </InputGroup>
          </div>

          <InputGroup label="Rentable Square Feet">
            <input
              type="number"
              value={inputs.squareFeet ?? inputs.rentableSqft}
              onChange={(e) => { handle('squareFeet', e.target.value); handle('rentableSqft', e.target.value); }}
              className={cn(inputCls, errors.rentableSqft && 'border-rose-400')}
            />
            <FieldError message={errors.rentableSqft} />
          </InputGroup>

          <InputGroup label="Unit Count">
            <input
              type="number"
              value={inputs.unitCount ?? (typeof inputs.units === 'number' ? inputs.units : units.reduce((s, u) => s + (Number(u.count) || 1), 0))}
              onChange={(e) => handle('unitCount', e.target.value)}
              className={cn(inputCls, errors.units && 'border-rose-400')}
            />
            <FieldError message={errors.units} />
          </InputGroup>
        </div>
      </div>

      <div>
        <SectionTitle icon={DollarSign}>{isMultifamily ? 'Rent Roll (per unit type)' : 'Income'}</SectionTitle>
        {isMultifamily ? (
          <div className="space-y-3">
            {units.map((u, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 items-end bg-slate-50 rounded-lg p-2">
                <InputGroup label="Count">
                  <input type="number" value={u.count} onChange={(e) => updateUnit(idx, 'count', e.target.value)} className={inputCls} />
                </InputGroup>
                <InputGroup label="Market Rent">
                  <input type="number" value={u.marketRent} onChange={(e) => updateUnit(idx, 'marketRent', e.target.value)} className={inputCls} />
                </InputGroup>
                <InputGroup label="In-Place Rent">
                  <div className="flex gap-1 items-center">
                    <input type="number" value={u.inPlaceRent} onChange={(e) => updateUnit(idx, 'inPlaceRent', e.target.value)} className={inputCls} />
                    <button type="button" aria-label={`Remove unit type ${idx + 1}`} onClick={() => removeUnit(idx)} className="text-slate-400 hover:text-rose-500 text-lg px-1">×</button>
                  </div>
                </InputGroup>
              </div>
            ))}
            <button type="button" onClick={addUnit} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add unit type</button>
            <FieldError message={errors.units} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <InputGroup label="Total Annual Market Rent ($/yr)" tooltip="Entered as a single unit row at 1 SF-equivalent.">
              <Money
                value={units[0]?.marketRent ?? 0}
                onChange={(e) => onChange('units', [{ count: 1, marketRent: e.target.value, inPlaceRent: e.target.value }])}
              />
            </InputGroup>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-2">
          <InputGroup label="Lease Type">
            <select value={inputs.leaseType || 'gross'} onChange={(e) => handle('leaseType', e.target.value)} className={inputCls}>
              <option value="gross">Gross</option>
              <option value="MG">Modified Gross</option>
              <option value="NNN">NNN</option>
              <option value="absoluteNNN">Absolute NNN</option>
            </select>
          </InputGroup>
          <InputGroup label={`Recovery Ratio: ${Math.round((inputs.recoveryRatio ?? 0) * 100)}%`} tooltip="Share of OpEx reimbursed by tenants (NNN/MG).">
            <input type="range" min="0" max="1" step="0.05" value={inputs.recoveryRatio ?? 0} onChange={(e) => handle('recoveryRatio', e.target.value)} className="w-full" />
          </InputGroup>
          <div className="col-span-2">
            <InputGroup label="Annual Operating Expenses">
              <Money value={inputs.opexAnnual ?? inputs.annualOperatingExpenses ?? 0} onChange={(e) => { handle('opexAnnual', e.target.value); handle('annualOperatingExpenses', e.target.value); }} />
            </InputGroup>
          </div>
          <InputGroup label={`Vacancy: ${inputs.vacancyPct ?? 0}%`}>
            <input type="range" min="0" max="25" step="0.5" value={inputs.vacancyPct ?? 0} onChange={(e) => handle('vacancyPct', e.target.value)} className="w-full" />
          </InputGroup>
          <InputGroup label={`Credit Loss: ${inputs.creditLossPct ?? 0}%`}>
            <input type="range" min="0" max="10" step="0.5" value={inputs.creditLossPct ?? 0} onChange={(e) => handle('creditLossPct', e.target.value)} className="w-full" />
          </InputGroup>
        </div>
      </div>

      <div>
        <SectionTitle icon={Banknote}>Debt Sizing</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Max LTV %"><Pct value={inputs.maxLTV ?? 75} onChange={(e) => handle('maxLTV', e.target.value)} step="1" /></InputGroup>
          <InputGroup label="Min DSCR">
            <input type="number" step="0.05" value={inputs.minDSCR ?? 1.25} onChange={(e) => handle('minDSCR', e.target.value)} className={inputCls} />
          </InputGroup>
          <InputGroup label="Min Debt Yield %"><Pct value={inputs.minDebtYield ?? 8} onChange={(e) => handle('minDebtYield', e.target.value)} step="0.5" /></InputGroup>
          <InputGroup label="Interest Rate %"><Pct value={inputs.interestRate} onChange={(e) => handle('interestRate', e.target.value)} step="0.01" /></InputGroup>
          <InputGroup label="Amortization (Years)">
            <input type="number" value={inputs.amortYears ?? inputs.loanTermYears ?? 30} onChange={(e) => { handle('amortYears', e.target.value); handle('loanTermYears', e.target.value); }} className={inputCls} />
          </InputGroup>
          <InputGroup label="Interest-Only">
            <select value={inputs.interestOnly ? 'yes' : 'no'} onChange={(e) => handle('interestOnly', e.target.value === 'yes')} className={inputCls}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </InputGroup>
        </div>
      </div>

      <div>
        <SectionTitle icon={TrendingUp}>Returns & Exit</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Going-In Cap Rate"><Pct value={inputs.goingInCapRate} onChange={(e) => handle('goingInCapRate', e.target.value)} /></InputGroup>
          <InputGroup label="Exit Cap Rate"><Pct value={inputs.exitCapRate} onChange={(e) => handle('exitCapRate', e.target.value)} /></InputGroup>
          <InputGroup label="Hold (Years)">
            <input type="number" value={inputs.holdYears ?? 5} onChange={(e) => handle('holdYears', e.target.value)} className={inputCls} />
          </InputGroup>
          <InputGroup label="Sale Cost %"><Pct value={inputs.saleCostPct ?? 2} onChange={(e) => handle('saleCostPct', e.target.value)} step="0.5" /></InputGroup>
          <InputGroup label="Rent Growth %"><Pct value={inputs.rentGrowthPct ?? 3} onChange={(e) => handle('rentGrowthPct', e.target.value)} step="0.5" /></InputGroup>
          <InputGroup label="Expense Growth %"><Pct value={inputs.expenseGrowthPct ?? 3} onChange={(e) => handle('expenseGrowthPct', e.target.value)} step="0.5" /></InputGroup>
        </div>
      </div>
    </div>
  );
};
