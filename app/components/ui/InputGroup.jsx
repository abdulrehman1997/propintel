'use client';
import { Tooltip } from './Tooltip';

export const InputGroup = ({ label, children, tooltip }) => (
  <div className="mb-4">
    <label className="flex items-center text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
      {label}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
    {children}
  </div>
);
