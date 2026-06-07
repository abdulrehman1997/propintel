import { cn } from './cn';

export function getScoreColor(score) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (score >= 65) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (score >= 35) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}
