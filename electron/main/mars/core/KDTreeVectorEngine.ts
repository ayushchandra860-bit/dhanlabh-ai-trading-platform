import { IVectorEngine, FeatureVector } from '../interfaces/IVectorEngine';
import { LoggerService } from '../../LoggerService';

/**
 * A lightweight, in-memory implementation of a Vector Engine using Euclidean Distance.
 * For production scale (>100k vectors), this interface can be swapped for FAISS or Milvus.
 */
export class KDTreeVectorEngine implements IVectorEngine {
  private vectors: FeatureVector[] = [];

  public insert(vector: FeatureVector): void {
    this.vectors.push(vector);
  }

  public search(target: number[], k: number): Array<{ id: string; distance: number }> {
    if (this.vectors.length === 0) return [];
    if (this.vectors[0].dimensions.length !== target.length) {
      throw new Error('Dimensionality mismatch in Vector Engine search.');
    }

    // O(N) Brute force fallback (Sufficient for early iterations < 10,000 vectors)
    // A true KD-Tree re-balances on insert, but brute force is faster to implement safely
    // for exact math in the first prototype.
    const distances = this.vectors.map(v => {
      return { id: v.id, distance: this.euclideanDistance(target, v.dimensions) };
    });

    // Sort by smallest distance (closest match)
    distances.sort((a, b) => a.distance - b.distance);

    return distances.slice(0, k);
  }

  public clear(): void {
    this.vectors = [];
    LoggerService.info('[MARS Vector Engine] Index cleared.');
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
