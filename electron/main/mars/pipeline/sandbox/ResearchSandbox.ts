import { IDatabase } from '../../interfaces/IDatabase';
import { LoggerService } from '../../../LoggerService';

export class ResearchSandbox {
  private db: IDatabase;

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Executes a hypothetical reasoning payload within an isolated SQLite Savepoint.
   * If the reasoning corrupts the graph or produces anomalies, the transaction is completely rolled back.
   *
   * @param experimentFn The experimental function to run inside the sandbox
   */
  public async executeHypothetical<T>(experimentFn: () => Promise<T>): Promise<T | null> {
    try {
      this.db.beginTransaction(); // Start a savepoint
      
      const result = await experimentFn();

      // Research sandboxes NEVER commit to the production memory by default.
      // They are designed purely to "what-if" the current context.
      this.db.rollbackTransaction(); 
      return result;
      
    } catch (err) {
      LoggerService.error(`[MARS Sandbox] Hypothetical execution failed. Rolling back cleanly. ${err}`);
      this.db.rollbackTransaction();
      return null;
    }
  }
}
