import { IDatabase } from '../../interfaces/IDatabase';
import { LoggerService } from '../../../LoggerService';

export class CausalInferenceEngine {
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Traverses the CKG (Cognitive Knowledge Graph) to find causal probability of an event.
   * i.e., "Does A cause B?"
   */
  public async getCausalProbability(sourceNodeId: string, targetNodeId: string): Promise<number> {
    try {
      const edges = await this.db.getEdgesForNode(sourceNodeId, 'OUT');
      const causalEdge = edges.find(e => e.targetNodeId === targetNodeId && e.relationship === 'CAUSES');

      if (causalEdge) {
        return causalEdge.causalProbability;
      }
      return 0; // Unknown causality
    } catch (err) {
      LoggerService.error(`[MARS Causal] Failed to fetch causal links: ${err}`);
      return 0;
    }
  }
}
