export interface FeatureVector {
  id: string;
  dimensions: number[];
  metadata?: any;
}

export interface IVectorEngine {
  /**
   * Inserts a vector into the index.
   */
  insert(vector: FeatureVector): void;

  /**
   * Finds the K nearest neighbors to a target vector.
   * Returns an array of matches containing the vector ID and distance score.
   */
  search(target: number[], k: number): Array<{ id: string; distance: number }>;

  /**
   * Clears the index.
   */
  clear(): void;
}
