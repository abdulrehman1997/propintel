// Grade-circle tones — desaturated editorial-luxury palette.
// (Classes resolve through the remapped Tailwind scales.)
export function getScoreColor(score) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (score >= 65) return 'bg-forest-100 text-forest-800 border-forest-200';
  if (score >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (score >= 35) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-800 border-rose-200';
}
