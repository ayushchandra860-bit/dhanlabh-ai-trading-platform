export type MemoryTier = 'L1_WORKING' | 'L2_SHORT_TERM' | 'L3_LONG_TERM' | 'L4_ARCHIVE';

export interface CKGNode {
  id: string;
  type: string; // e.g., 'Concept', 'Regime', 'Pattern'
  attributes: string; // JSON payload
  memoryTier: MemoryTier;
  confidence: number;
  observationCount: number;
  lastObserved: number;
  archivedAt: number | null;
}

export interface CKGEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string; // e.g., 'CAUSES', 'CORRELATES_WITH'
  weight: number;
  causalProbability: number;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  marketSnapshotRef: string;
  observation: string;
  hypothesis: string;
  evidence: string;
  reflection: string;
  conclusion: string;
  knowledgeLinks: string; // JSON array of CKGNode IDs
  tags: string;
}

export interface IDatabase {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Transactions
  beginTransaction(): void;
  commitTransaction(): void;
  rollbackTransaction(): void;

  // CKG Node Operations
  saveNode(node: CKGNode): Promise<void>;
  getNode(id: string): Promise<CKGNode | null>;
  
  // CKG Edge Operations
  saveEdge(edge: CKGEdge): Promise<void>;
  getEdgesForNode(nodeId: string, direction: 'IN' | 'OUT' | 'BOTH'): Promise<CKGEdge[]>;

  // Journal Operations (FTS5 Supported)
  saveJournalEntry(entry: JournalEntry): Promise<void>;
  searchJournalFTS(searchTerm: string): Promise<JournalEntry[]>;
}

