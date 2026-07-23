import { IVectorEngine } from '../../interfaces/IVectorEngine';
import { TemporalContext } from '../context/ContextAggregator';

export interface PredictiveMatch {
  historicalContextId: string;
  similarityScore: number; // 0-100
}

export class PredictiveKDTreeMatcher {
  private vectorEngine: IVectorEngine;

  constructor(vectorEngine: IVectorEngine) {
    this.vectorEngine = vectorEngine;
  }

  /**
   * Uses the Vector Engine to find the K most similar historical moments.
   */
  public findSimilarHistory(context: TemporalContext, k: number = 5): PredictiveMatch[] {
    const rawMatches = this.vectorEngine.search(context.featureVector, k);

    // Convert raw Euclidean distance to a 0-100 similarity score
    return rawMatches.map(match => {
      // Euclidean distance 0 = 100% similarity. Max distance depends on dimensions.
      // Since vectors are normalized [-1, 1], max distance for 4 dims is sqrt(16) = 4.
      const maxDistance = 4.0; 
      const rawScore = 100 - ((match.distance / maxDistance) * 100);
      
      return {
        historicalContextId: match.id,
        similarityScore: Math.max(0, Math.min(100, rawScore))
      };
    });
  }
}
