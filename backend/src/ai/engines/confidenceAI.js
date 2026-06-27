import { engineResult } from '../helpers.js';
import { average } from '../../utils/math.js';

export function confidenceAI(ctx, previousResults = []) {
  const actionable = previousResults.filter((result) => result.vote !== 'WAIT');
  const agreement = actionable.length ? Math.max(
    actionable.filter((result) => result.vote === 'BUY').length,
    actionable.filter((result) => result.vote === 'SELL').length
  ) / actionable.length : 0;
  const avgConfidence = average(previousResults.map((result) => result.confidence));
  const score = agreement > 0.68
    ? (actionable.filter((result) => result.vote === 'BUY').length >= actionable.filter((result) => result.vote === 'SELL').length ? 16 : -16)
    : 0;
  return engineResult('Confidence AI', score, avgConfidence * 0.65 + agreement * 35, [
    `${Math.round(agreement * 100)}% AI-engine directional agreement`,
    `Average engine confidence ${Math.round(avgConfidence)}%`
  ], { agreement, avgConfidence }, 1.0);
}
