'use client';
import { TrendingUp } from 'lucide-react';

export const AppFooter = () => (
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
);
