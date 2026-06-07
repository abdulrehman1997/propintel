'use client';
import { cn } from '../../lib/cn';
import { formatCurrency } from '../../lib/format';
import { Card } from '../ui/Card';
import { InputGroup } from '../ui/InputGroup';
import { Home, DollarSign, Percent, TrendingUp } from 'lucide-react';

const inputCls = 'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tabular-nums text-sm';

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-rose-500 mt-1">{message}</p> : null;

export const ResidentialInputs = ({ inputs, results, onChange, errors = {} }) => {
  const handle = (key, value) => onChange(key, value);

  return (
    <div className="space-y-4">
      <Card title="Property & Purchase" icon={Home} defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputGroup label="Purchase Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={inputs.purchasePrice}
                  onChange={(e) => handle('purchasePrice', e.target.value)}
                  className={cn(inputCls, 'pl-7', errors.purchasePrice && 'border-rose-400')}
                />
              </div>
              <FieldError message={errors.purchasePrice} />
            </InputGroup>
          </div>

          <InputGroup label="Bedrooms">
            <select
              value={inputs.bedrooms}
              onChange={(e) => handle('bedrooms', e.target.value)}
              className={inputCls}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n === 0 ? 'Studio' : `${n} BR`}</option>
              ))}
            </select>
          </InputGroup>

          <InputGroup label="Repair Costs">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={inputs.repairCosts}
                onChange={(e) => handle('repairCosts', e.target.value)}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </InputGroup>

          <div className="col-span-2">
            <InputGroup label={`Down Payment: ${inputs.downPaymentPct}% (${formatCurrency(results?.downPaymentDollar ?? 0)})`}>
              <input
                type="range" min="0" max="100"
                value={inputs.downPaymentPct}
                onChange={(e) => handle('downPaymentPct', e.target.value)}
                className="mb-2 w-full"
              />
              <div className="flex justify-between gap-1">
                {[3.5, 5, 10, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handle('downPaymentPct', pct)}
                    className={cn(
                      'flex-1 text-[10px] py-1.5 rounded-md font-semibold transition-all border',
                      inputs.downPaymentPct === pct
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <FieldError message={errors.downPaymentPct} />
            </InputGroup>
          </div>

          <InputGroup label="Interest Rate">
            <div className="relative">
              <input
                type="number" step="0.01"
                value={inputs.interestRate}
                onChange={(e) => handle('interestRate', e.target.value)}
                className={cn(inputCls, 'pr-7', errors.interestRate && 'border-rose-400')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
            <FieldError message={errors.interestRate} />
          </InputGroup>

          <InputGroup label="Loan Term">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              {[15, 20, 30].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handle('loanTermYears', term)}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all',
                    inputs.loanTermYears === term
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {term}yr
                </button>
              ))}
            </div>
          </InputGroup>
        </div>
      </Card>

      <Card title="Rental Income" icon={DollarSign} defaultOpen>
        <div className="space-y-4">
          <InputGroup label="Monthly Rent">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={inputs.monthlyRent}
                onChange={(e) => handle('monthlyRent', e.target.value)}
                className={cn(inputCls, 'pl-7 text-lg font-bold', errors.monthlyRent && 'border-rose-400')}
              />
            </div>
            <FieldError message={errors.monthlyRent} />
          </InputGroup>

          <InputGroup label={`Vacancy Rate: ${inputs.vacancyPct}%`}>
            <input
              type="range" min="0" max="20" step="0.5"
              value={inputs.vacancyPct}
              onChange={(e) => handle('vacancyPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>

          <InputGroup label={`Management Fee: ${inputs.managementPct}%`}>
            <input
              type="range" min="0" max="15" step="0.5"
              value={inputs.managementPct}
              onChange={(e) => handle('managementPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
        </div>
      </Card>

      <Card title="Expenses" icon={Percent}>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Property Tax (Annual)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={inputs.annualPropertyTax}
                onChange={(e) => handle('annualPropertyTax', e.target.value)}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </InputGroup>
          <InputGroup label="Insurance (Annual)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={inputs.annualInsurance}
                onChange={(e) => handle('annualInsurance', e.target.value)}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </InputGroup>
          <InputGroup label={`Maintenance: ${inputs.maintenancePct}%`}>
            <input
              type="range" min="0" max="10" step="0.5"
              value={inputs.maintenancePct}
              onChange={(e) => handle('maintenancePct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
          <InputGroup label={`CapEx: ${inputs.capExPct}%`}>
            <input
              type="range" min="0" max="10" step="0.5"
              value={inputs.capExPct}
              onChange={(e) => handle('capExPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
          <InputGroup label="HOA (Monthly)">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={inputs.monthlyHOA ?? 0}
                onChange={(e) => handle('monthlyHOA', e.target.value)}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </InputGroup>
        </div>
      </Card>

      <Card title="Projection & Exit" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Hold Period (Years)">
            <input
              type="number" min="1" max="40"
              value={inputs.holdYears ?? 5}
              onChange={(e) => handle('holdYears', e.target.value)}
              className={inputCls}
            />
          </InputGroup>
          <InputGroup label={`Appreciation: ${inputs.appreciationPct ?? 3}%`} tooltip="Annual property value growth — was previously hardcoded.">
            <input
              type="range" min="0" max="10" step="0.5"
              value={inputs.appreciationPct ?? 3}
              onChange={(e) => handle('appreciationPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
          <InputGroup label={`Rent Growth: ${inputs.rentGrowthPct ?? 3}%`}>
            <input
              type="range" min="0" max="10" step="0.5"
              value={inputs.rentGrowthPct ?? 3}
              onChange={(e) => handle('rentGrowthPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
          <InputGroup label={`Expense Growth: ${inputs.expenseGrowthPct ?? 3}%`}>
            <input
              type="range" min="0" max="10" step="0.5"
              value={inputs.expenseGrowthPct ?? 3}
              onChange={(e) => handle('expenseGrowthPct', e.target.value)}
              className="w-full"
            />
          </InputGroup>
          <InputGroup label="Exit Cap Rate" tooltip="Terminal value = forward NOI ÷ exit cap. Leave 0 to use appreciated value.">
            <div className="relative">
              <input
                type="number" step="0.1"
                value={inputs.exitCapRate ?? 0}
                onChange={(e) => handle('exitCapRate', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>
          <InputGroup label="Sale Cost %" tooltip="Selling costs deducted from terminal value.">
            <div className="relative">
              <input
                type="number" step="0.5"
                value={inputs.saleCostPct ?? 6}
                onChange={(e) => handle('saleCostPct', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>
        </div>
      </Card>
    </div>
  );
};
