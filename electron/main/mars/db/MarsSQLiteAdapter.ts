import type * as DatabaseType from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { IDatabase, CKGNode, CKGEdge, JournalEntry } from '../interfaces/IDatabase';
import { LoggerService } from '../../LoggerService';

let Database: any = null;
try {
  Database = require('better-sqlite3');
} catch (e) {
  LoggerService.warn(`[MARS DB] Native SQLite module unavailable. DB operations will be safely skipped. Error: ${e}`);
}

export class MarsSQLiteAdapter implements IDatabase {
  private db: DatabaseType.Database | null = null;
  
  public async connect(): Promise<void> {
    if (this.db) return;
    if (!Database) {
      LoggerService.warn('[MARS DB] Database driver missing. Running without persistent memory.');
      return;
    }
    
    // Store in user data path to persist across updates
    const userDataPath = app ? app.getPath('userData') : __dirname;
    const dbPath = path.join(userDataPath, 'mars_brain.db');
    try {
      this.db = new Database(dbPath);
      
      // PRODUCTION HARDENING (Part 8)
      this.db?.pragma('journal_mode = WAL'); // Better concurrency
      this.db?.pragma('busy_timeout = 5000'); // Prevent SQLITE_BUSY concurrency errors
      this.db?.pragma('synchronous = NORMAL'); // Balance between safety and speed
      this.db?.pragma('temp_store = MEMORY'); // Faster temp operations
      this.db?.pragma('mmap_size = 30000000000'); // Use memory mapped I/O
      
      this.initSchema();
      LoggerService.info(`[MARS DAL] Connected to hardened SQLite database at ${dbPath}`);
    } catch (e) {
      LoggerService.warn(`[MARS DB] Failed to instantiate SQLite database, likely ABI mismatch. Running without persistent memory. Error: ${e}`);
      this.db = null;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.db) {
      this.db?.pragma('wal_checkpoint(TRUNCATE)'); // Clean shutdown
      this.db?.close();
      this.db = null;
    }
  }

  private initSchema() {
    if (!this.db) return;
    
    // CKG Nodes Table
    this.db?.exec(`
      CREATE TABLE IF NOT EXISTS ckg_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        attributes TEXT,
        memoryTier TEXT NOT NULL,
        confidence REAL,
        observationCount INTEGER,
        lastObserved INTEGER,
        archivedAt INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_ckg_type ON ckg_nodes(type);
      CREATE INDEX IF NOT EXISTS idx_ckg_tier ON ckg_nodes(memoryTier);
      
      -- CKG Edges Table
      CREATE TABLE IF NOT EXISTS ckg_edges (
        id TEXT PRIMARY KEY,
        sourceNodeId TEXT NOT NULL,
        targetNodeId TEXT NOT NULL,
        relationship TEXT NOT NULL,
        weight REAL,
        causalProbability REAL,
        FOREIGN KEY(sourceNodeId) REFERENCES ckg_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY(targetNodeId) REFERENCES ckg_nodes(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_edge_source ON ckg_edges(sourceNodeId);
      CREATE INDEX IF NOT EXISTS idx_edge_target ON ckg_edges(targetNodeId);
      
      -- FTS5 Journal Table (Part 8)
      CREATE VIRTUAL TABLE IF NOT EXISTS journal_fts USING fts5(
        id,
        observation,
        hypothesis,
        reflection,
        conclusion,
        tags
      );
      
      -- Standard Journal Metadata
      CREATE TABLE IF NOT EXISTS journal_meta (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        marketSnapshotRef TEXT,
        evidence TEXT,
        knowledgeLinks TEXT
      );

      -- Signal History & Calibration Table
      CREATE TABLE IF NOT EXISTS signal_records (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        assetPair TEXT,
        timeframe TEXT,
        signal TEXT NOT NULL,
        confidence REAL NOT NULL,
        expiry TEXT,
        reason TEXT,
        marketSnapshot TEXT,
        outcome TEXT DEFAULT 'PENDING'
      );

      CREATE INDEX IF NOT EXISTS idx_signal_ts ON signal_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_signal_outcome ON signal_records(outcome);
    `);
  }

  public beginTransaction(): void {
    if (this.db) this.db?.prepare('BEGIN').run();
  }

  public commitTransaction(): void {
    if (this.db) this.db?.prepare('COMMIT').run();
  }

  public rollbackTransaction(): void {
    if (this.db) this.db?.prepare('ROLLBACK').run();
  }

  // --- CKG Node Operations ---
  public async saveNode(node: CKGNode): Promise<void> {
    if (!this.db) return;
    const stmt = this.db?.prepare(`
      INSERT OR REPLACE INTO ckg_nodes (
        id, type, attributes, memoryTier, confidence, observationCount, lastObserved, archivedAt
      ) VALUES (
        @id, @type, @attributes, @memoryTier, @confidence, @observationCount, @lastObserved, @archivedAt
      )
    `);
    stmt.run(node);
  }

  public async getNode(id: string): Promise<CKGNode | null> {
    if (!this.db) return null;
    const stmt = this.db?.prepare('SELECT * FROM ckg_nodes WHERE id = ?');
    return (stmt.get(id) as CKGNode) || null;
  }

  // --- CKG Edge Operations ---
  public async saveEdge(edge: CKGEdge): Promise<void> {
    if (!this.db) return;
    const stmt = this.db?.prepare(`
      INSERT OR REPLACE INTO ckg_edges (
        id, sourceNodeId, targetNodeId, relationship, weight, causalProbability
      ) VALUES (
        @id, @sourceNodeId, @targetNodeId, @relationship, @weight, @causalProbability
      )
    `);
    stmt.run(edge);
  }

  public async getEdgesForNode(nodeId: string, direction: 'IN' | 'OUT' | 'BOTH'): Promise<CKGEdge[]> {
    if (!this.db) return [];
    let sql = '';
    
    if (direction === 'OUT') sql = 'SELECT * FROM ckg_edges WHERE sourceNodeId = ?';
    else if (direction === 'IN') sql = 'SELECT * FROM ckg_edges WHERE targetNodeId = ?';
    else sql = 'SELECT * FROM ckg_edges WHERE sourceNodeId = ? OR targetNodeId = ?';

    const stmt = this.db?.prepare(sql);
    const results = direction === 'BOTH' ? stmt.all(nodeId, nodeId) : stmt.all(nodeId);
    return results as CKGEdge[];
  }

  // --- Journal Operations ---
  public async saveJournalEntry(entry: JournalEntry): Promise<void> {
    if (!this.db) return;
    
    this.beginTransaction();
    try {
      // Insert into FTS5
      const ftsStmt = this.db?.prepare(`
        INSERT INTO journal_fts (id, observation, hypothesis, reflection, conclusion, tags)
        VALUES (@id, @observation, @hypothesis, @reflection, @conclusion, @tags)
      `);
      ftsStmt.run(entry);

      // Insert Metadata
      const metaStmt = this.db?.prepare(`
        INSERT INTO journal_meta (id, timestamp, marketSnapshotRef, evidence, knowledgeLinks)
        VALUES (@id, @timestamp, @marketSnapshotRef, @evidence, @knowledgeLinks)
      `);
      metaStmt.run(entry);

      this.commitTransaction();
    } catch (err) {
      this.rollbackTransaction();
      throw err;
    }
  }

  public async searchJournalFTS(searchTerm: string): Promise<JournalEntry[]> {
    if (!this.db) return [];
    
    // FTS5 MATCH query
    const sql = `
      SELECT f.*, m.timestamp, m.marketSnapshotRef, m.evidence, m.knowledgeLinks 
      FROM journal_fts f
      JOIN journal_meta m ON f.id = m.id
      WHERE journal_fts MATCH ?
      ORDER BY m.timestamp DESC
      LIMIT 100
    `;
    
    const stmt = this.db?.prepare(sql);
    // Sanitize search term to prevent FTS5 syntax errors
    const sanitizedQuery = `"${searchTerm.replace(/"/g, '""')}"`;
    return stmt.all(sanitizedQuery) as JournalEntry[];
  }

  // --- Signal Records Operations (Phase 6 Self-Calibration) ---
  public async saveSignalRecord(record: {
    id: string;
    timestamp: number;
    assetPair: string;
    timeframe: string;
    signal: string;
    confidence: number;
    expiry: string;
    reason: string;
    marketSnapshot: string;
    outcome?: string;
  }): Promise<void> {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO signal_records (
        id, timestamp, assetPair, timeframe, signal, confidence, expiry, reason, marketSnapshot, outcome
      ) VALUES (
        @id, @timestamp, @assetPair, @timeframe, @signal, @confidence, @expiry, @reason, @marketSnapshot, @outcome
      )
    `);
    stmt.run({ outcome: 'PENDING', ...record });
  }

  public async getSignalRecords(limit = 200): Promise<any[]> {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT * FROM signal_records ORDER BY timestamp DESC LIMIT ?
    `);
    return stmt.all(limit);
  }

  public async updateSignalOutcome(id: string, outcome: 'WIN' | 'LOSS'): Promise<void> {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      UPDATE signal_records SET outcome = ? WHERE id = ?
    `);
    stmt.run(outcome, id);
  }
}
