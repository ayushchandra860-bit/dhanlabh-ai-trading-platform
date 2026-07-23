import { IDatabase, CKGNode, MemoryTier } from '../interfaces/IDatabase';
import { LoggerService } from '../../LoggerService';

export class MemoryController {
  private db: IDatabase;
  
  // L1: Transient Working Memory (cleared very frequently, e.g. per-tick reasoning)
  private l1WorkingMemory: Map<string, any> = new Map();
  
  // L2: Short Term Cache (LRU cache for recent CKG Nodes)
  private l2Cache: Map<string, { node: CKGNode; lastAccessed: number }> = new Map();
  private readonly L2_MAX_SIZE = 1000;

  constructor(db: IDatabase) {
    this.db = db;
  }

  // --- L1 Methods ---
  public setL1(key: string, value: any): void {
    this.l1WorkingMemory.set(key, value);
  }

  public getL1(key: string): any {
    return this.l1WorkingMemory.get(key);
  }

  public clearL1(): void {
    this.l1WorkingMemory.clear();
  }

  // --- Tiered Node Access ---
  public async getNode(id: string): Promise<CKGNode | null> {
    // 1. Check L2 Cache
    const cached = this.l2Cache.get(id);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.node;
    }

    // 2. Fallback to L3 SQLite Database
    const node = await this.db.getNode(id);
    if (node) {
      this.promoteToL2(node);
      return node;
    }

    return null;
  }

  public async saveNode(node: CKGNode): Promise<void> {
    // Save to L3
    await this.db.saveNode(node);
    
    // Promote to L2
    this.promoteToL2(node);
  }

  private promoteToL2(node: CKGNode): void {
    if (this.l2Cache.size >= this.L2_MAX_SIZE) {
      this.evictLRU();
    }
    this.l2Cache.set(node.id, { node, lastAccessed: Date.now() });
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, val] of this.l2Cache.entries()) {
      if (val.lastAccessed < oldestAccess) {
        oldestAccess = val.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.l2Cache.delete(oldestKey);
    }
  }

  // --- L4 Archival Logic ---
  public async archiveNode(id: string): Promise<void> {
    const node = await this.getNode(id);
    if (!node) return;

    node.memoryTier = 'L4_ARCHIVE';
    node.archivedAt = Date.now();
    
    await this.db.saveNode(node);
    this.l2Cache.delete(id);
    
    LoggerService.info(`[MARS Memory] Node ${id} moved to L4_ARCHIVE.`);
  }
}
