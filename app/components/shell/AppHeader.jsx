'use client';
import { motion } from 'framer-motion';

export const AppHeader = () => (
  <header className="w-full bg-forest-700 text-paper-50 relative overflow-hidden">
    {/* subtle vertical sheen, no bling */}
    <div
      className="absolute inset-0 pointer-events-none opacity-60"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 28%, transparent 70%, rgba(0,0,0,0.18) 100%)',
      }}
    />
    <div className="max-w-[1240px] mx-auto px-6 md:px-10 py-12 md:py-16 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <p className="text-[11px] uppercase tracking-[0.35em] text-brass-400 font-semibold mb-4">
          Real Estate Intelligence
        </p>
        <h1 className="font-display text-5xl md:text-7xl font-light tracking-tight text-paper-50 leading-[0.95]">
          PropIntel
        </h1>
        <div className="mt-6 mb-5 h-px max-w-md bg-forest-400/40" />
        <p className="font-display italic text-lg md:text-xl text-paper-100/90 max-w-xl">
          Know your numbers before you make an offer.
        </p>
        <p className="text-paper-200/60 text-sm mt-2 tracking-wide">
          Investment analysis for the discerning individual investor.
        </p>
      </motion.div>
    </div>
  </header>
);
