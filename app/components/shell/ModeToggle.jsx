'use client';
import { motion } from 'framer-motion';
import { Home, Building2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const MODES = [
  { id: 'residential', label: 'Residential', icon: Home },
  { id: 'commercial', label: 'Commercial', icon: Building2 },
];

export const ModeToggle = ({ mode, onChange }) => (
  <div
    role="group"
    aria-label="Property type"
    className="inline-flex p-1 bg-paper-100 rounded-full border border-paper-200 shadow-inset"
  >
    {MODES.map(({ id, label, icon: Icon }) => {
      const isActive = mode === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={isActive}
          onClick={() => onChange(id)}
          className={cn(
            'relative flex items-center gap-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] rounded-full transition-colors duration-200',
            isActive ? 'text-paper-50' : 'text-ink-500 hover:text-ink-700',
          )}
        >
          {isActive && (
            <motion.span
              layoutId="mode-toggle-bg"
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="absolute inset-0 bg-forest-700 rounded-full shadow-soft"
            />
          )}
          <Icon size={14} className="relative z-10" />
          <span className="relative z-10">{label}</span>
        </button>
      );
    })}
  </div>
);
