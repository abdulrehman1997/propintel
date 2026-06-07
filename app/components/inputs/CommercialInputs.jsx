'use client';
import { cn } from '../../lib/cn';
import { InputGroup } from '../ui/InputGroup';
import { Building2, DollarSign, Percent } from 'lucide-react';

const inputCls = 'w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all tabular-nums text-sm';

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-rose-500 mt-1">{message}</p> : null;

export const CommercialInputs = ({ inputs, onChange, errors = {} }) => {
  const handle = (key, value) => onChange(key, value);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Building2 size={12} /> Property
        </h3>
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

          <InputGroup label="Square Feet">
            <input
              type="number"
              value={inputs.squareFeet}
              onChange={(e) => handle('squareFeet', e.target.value)}
              className={cn(inputCls, errors.squareFeet && 'border-rose-400')}
            />
            <FieldError message={errors.squareFeet} />
          </InputGroup>

          <InputGroup label="Units">
            <input
              type="number"
              value={inputs.units}
              onChange={(e) => handle('units', e.target.value)}
              className={cn(inputCls, errors.units && 'border-rose-400')}
            />
            <FieldError message={errors.units} />
          </InputGroup>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <DollarSign size={12} /> Income & Expenses
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputGroup label="Annual Gross Income">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={inputs.annualGrossIncome}
                  onChange={(e) => handle('annualGrossIncome', e.target.value)}
                  className={cn(inputCls, 'pl-7', errors.annualGrossIncome && 'border-rose-400')}
                />
              </div>
              <FieldError message={errors.annualGrossIncome} />
            </InputGroup>
          </div>

          <div className="col-span-2">
            <InputGroup label="Annual Operating Expenses">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={inputs.annualOperatingExpenses}
                  onChange={(e) => handle('annualOperatingExpenses', e.target.value)}
                  className={cn(inputCls, 'pl-7')}
                />
              </div>
            </InputGroup>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Percent size={12} /> Financing & Returns
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="Down Payment %">
            <div className="relative">
              <input
                type="number" step="0.5"
                value={inputs.downPaymentPct}
                onChange={(e) => handle('downPaymentPct', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>

          <InputGroup label="Interest Rate">
            <div className="relative">
              <input
                type="number" step="0.01"
                value={inputs.interestRate}
                onChange={(e) => handle('interestRate', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>

          <InputGroup label="Loan Term (Years)">
            <input
              type="number"
              value={inputs.loanTermYears}
              onChange={(e) => handle('loanTermYears', e.target.value)}
              className={inputCls}
            />
          </InputGroup>

          <InputGroup label="Going-In Cap Rate">
            <div className="relative">
              <input
                type="number" step="0.1"
                value={inputs.goingInCapRate}
                onChange={(e) => handle('goingInCapRate', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>

          <InputGroup label="Exit Cap Rate">
            <div className="relative">
              <input
                type="number" step="0.1"
                value={inputs.exitCapRate}
                onChange={(e) => handle('exitCapRate', e.target.value)}
                className={cn(inputCls, 'pr-7')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </InputGroup>
        </div>
      </div>
    </div>
  );
};
