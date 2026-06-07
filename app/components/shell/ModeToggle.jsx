'use client';
import { motion } from 'framer-motion';
import { Home, Building2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const MODES = [
  { id: 'residential', label: 'Residential', icon: Home },
  { id: 'commercial', label: 'Commercial', icon: Building2 },
];

export const ModeToggle = ({ mode, onChange }) => (
  <div role="group" aria-label="Property type" className="inline-flex p-1 bg-slate-100 rounded-xl">
    {MODES.map(({ id, label, icon: Icon }) => {
      const isActive = mode === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(id)}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors',
            isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {isActive && (
            <motion.span layoutId="mode-toggle-bg" className="absolute inset-0 bg-white rounded-lg shadow-sm" />
          )}
          <Icon size={14} className="relative z-10" />
          <span className="relative z-10">{label}</span>
        </button>
      );
    })}
  </div>
);
