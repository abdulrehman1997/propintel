'use client';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export const AppHeader = () => (
  <header className="bg-[#0F172A] text-white py-12 px-6 relative overflow-hidden">
    <div className="max-w-6xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">PropIntel</h1>
          </div>
          <p className="text-slate-400 text-lg">"Know your numbers before you make an offer."</p>
          <p className="text-slate-500 text-sm mt-1">Real estate investment analyzer for individual investors</p>
        </div>
      </motion.div>
    </div>
    <div
      className="absolute inset-0 opacity-10 pointer-events-none"
      style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    />
  </header>
);
