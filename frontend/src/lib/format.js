export const money = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: value > 100 ? 2 : 6 });
export const pct = (value) => `${Math.round(Number(value || 0))}%`;

export function badgeTone(value) {
  if (value === 'BUY' || value === 'A+' || value === 'A' || value === 'Low' || value === 'Good' || value === 'Positive') return 'text-mint bg-mint/10 border-mint/25';
  if (value === 'SELL' || value === 'High' || value === 'Bad' || value === 'Negative') return 'text-danger bg-danger/10 border-danger/25';
  if (value === 'NO TRADE' || value === 'WAIT' || value === 'Medium' || value === 'Moderate' || value === 'Neutral') return 'text-amber bg-amber/10 border-amber/25';
  return 'text-slate-300 bg-white/5 border-white/10';
}
