import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, rmSync, statSync } from 'fs';
import { app } from 'electron';
import { LoggerService } from './LoggerService';

export interface TempFileRecord {
  id: string;
  filepath: string;
  module: string;
  createdTime: number;
  lastAccessTime: number;
  expirationTime: number;
  priority: number;
  size: number;
  status: 'ACTIVE' | 'EXPIRED' | 'DELETED';
}

export interface TempDiagnostics {
  currentTempSize: number;
  totalFiles: number;
  largestModule: string;
  oldestFile: number;
  newestFile: number;
  recoveredSpace: number;
  diskUsagePercent: number;
  lastCleanupTime: number;
}

export type TempModule = 'frames' | 'ocr' | 'vision' | 'signal_capture' | 'cache' | 'exports' | 'debug' | 'logs' | 'recovery';

const RETENTION_RULES: Record<TempModule, number> = {
  frames: 30 * 1000,
  ocr: 120 * 1000,
  vision: 120 * 1000,
  cache: 120 * 1000,
  signal_capture: 10 * 60 * 1000,
  debug: 24 * 60 * 60 * 1000,
  logs: 7 * 24 * 60 * 60 * 1000,
  recovery: 7 * 24 * 60 * 60 * 1000,
  exports: Number.MAX_SAFE_INTEGER
};

export class TempFileManager {
  private static instance: TempFileManager;
  private tempDir: string;
  private indexPath: string;
  private index: Record<string, TempFileRecord> = {};
  private recoveredSpaceBytes: number = 0;
  private lastCleanupTime: number = 0;
  private quotaBytes: number = 1024 * 1024 * 1024; // 1 GB
  private backgroundTask: NodeJS.Timeout | null = null;

  private constructor() {
    this.tempDir = path.join(app.getPath('userData'), 'temp_mars');
    this.indexPath = path.join(this.tempDir, 'temp_index.json');
  }

  public static getInstance(): TempFileManager {
    if (!TempFileManager.instance) {
      TempFileManager.instance = new TempFileManager();
    }
    return TempFileManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      
      const modules: TempModule[] = ['frames', 'ocr', 'vision', 'signal_capture', 'cache', 'exports', 'debug', 'logs', 'recovery'];
      for (const mod of modules) {
        await fs.mkdir(path.join(this.tempDir, mod), { recursive: true });
      }

      await this.loadIndex();
      await this.startupCleanup();

      this.backgroundTask = setInterval(() => this.runBackgroundCleanup(), 5 * 60 * 1000);
      LoggerService.info('TempFileManager initialized successfully.');
    } catch (e) {
      LoggerService.error('Failed to initialize TempFileManager', e);
    }
  }

  private async loadIndex(): Promise<void> {
    if (existsSync(this.indexPath)) {
      try {
        const raw = await fs.readFile(this.indexPath, 'utf-8');
        this.index = JSON.parse(raw);
      } catch (e) {
        LoggerService.error('Failed to load temp_index.json, rebuilding...', e);
        this.index = {};
      }
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
    } catch (e) {
      LoggerService.error('Failed to save temp_index.json', e);
    }
  }

  public async createTempFile(module: TempModule, filename: string, bufferOrString: Buffer | string): Promise<string> {
    const id = `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const filepath = path.join(this.tempDir, module, filename);
    
    try {
      await fs.writeFile(filepath, bufferOrString);
      const stats = await fs.stat(filepath);
      
      const record: TempFileRecord = {
        id,
        filepath,
        module,
        createdTime: Date.now(),
        lastAccessTime: Date.now(),
        expirationTime: Date.now() + RETENTION_RULES[module],
        priority: module === 'debug' ? 1 : module === 'signal_capture' ? 2 : 5,
        size: stats.size,
        status: 'ACTIVE'
      };

      this.index[id] = record;
      await this.saveIndex();
      await this.enforceQuota();
      return filepath;
    } catch (e) {
      LoggerService.error(`Failed to create temp file for module ${module}`, e);
      throw e;
    }
  }

  private async enforceQuota(): Promise<void> {
    const currentSize = this.getCurrentTempSize();
    if (currentSize > this.quotaBytes) {
      LoggerService.warn(`Temp storage exceeded quota (${(currentSize / 1024 / 1024).toFixed(2)} MB). Truncating...`);
      const records = Object.values(this.index)
        .filter(r => r.status === 'ACTIVE' && r.module !== 'exports')
        .sort((a, b) => a.priority - b.priority || a.lastAccessTime - b.lastAccessTime);
      
      for (const rec of records) {
        if (this.getCurrentTempSize() <= this.quotaBytes * 0.8) break;
        await this.deleteFile(rec.id);
      }
    }
  }

  public async startupCleanup(): Promise<void> {
    let deleted = 0;
    let recovered = 0;
    const start = performance.now();

    for (const [id, rec] of Object.entries(this.index)) {
      if (rec.status === 'ACTIVE' && Date.now() > rec.expirationTime) {
        const size = await this.deleteFile(id);
        if (size > 0) { deleted++; recovered += size; }
      }
    }

    const modules: TempModule[] = ['frames', 'ocr', 'vision', 'signal_capture', 'cache', 'exports', 'debug', 'logs', 'recovery'];
    for (const mod of modules) {
      const dirPath = path.join(this.tempDir, mod);
      if (!existsSync(dirPath)) continue;
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const isTracked = Object.values(this.index).some(r => r.filepath === fullPath && r.status === 'ACTIVE');
        if (!isTracked && mod !== 'exports') {
           try {
             const stats = await fs.stat(fullPath);
             await fs.unlink(fullPath);
             deleted++;
             recovered += stats.size;
           } catch(e) {}
        }
      }
    }

    this.recoveredSpaceBytes += recovered;
    this.lastCleanupTime = Date.now();
    await this.saveIndex();

    LoggerService.info(`Startup Cleanup Report:\nDeleted temp files: ${deleted}\nRecovered space: ${(recovered / 1024 / 1024).toFixed(2)} MB\nRemaining temp files: ${Object.values(this.index).filter(r => r.status === 'ACTIVE').length}\nCleanup duration: ${(performance.now() - start).toFixed(2)} ms`);
  }

  public async runBackgroundCleanup(): Promise<void> {
    let deleted = 0;
    let recovered = 0;
    for (const [id, rec] of Object.entries(this.index)) {
      if (rec.status === 'ACTIVE' && Date.now() > rec.expirationTime) {
        const size = await this.deleteFile(id);
        if (size > 0) { deleted++; recovered += size; }
      }
    }
    if (deleted > 0) {
      this.recoveredSpaceBytes += recovered;
      this.lastCleanupTime = Date.now();
      await this.saveIndex();
      LoggerService.info(`Background Cleanup: Deleted ${deleted} files, recovered ${(recovered / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  public async shutdownCleanup(): Promise<void> {
    if (this.backgroundTask) clearInterval(this.backgroundTask);
    let deleted = 0;
    let recovered = 0;
    for (const [id, rec] of Object.entries(this.index)) {
      if (rec.status === 'ACTIVE' && Date.now() > rec.expirationTime) {
        const size = await this.deleteFile(id);
        if (size > 0) { deleted++; recovered += size; }
      }
    }
    this.recoveredSpaceBytes += recovered;
    this.lastCleanupTime = Date.now();
    await this.saveIndex();
    LoggerService.info(`Shutdown Cleanup: Deleted ${deleted} expired files. Recovered ${(recovered / 1024 / 1024).toFixed(2)} MB.`);
  }

  private async deleteFile(id: string): Promise<number> {
    const rec = this.index[id];
    if (!rec || rec.status !== 'ACTIVE') return 0;
    try {
      if (existsSync(rec.filepath)) {
        await fs.unlink(rec.filepath);
      }
      rec.status = 'DELETED';
      return rec.size;
    } catch (e) {
      LoggerService.error(`Failed to delete temp file ${rec.filepath}`, e);
      return 0;
    }
  }

  public getCurrentTempSize(): number {
    return Object.values(this.index)
      .filter(r => r.status === 'ACTIVE')
      .reduce((sum, r) => sum + r.size, 0);
  }

  public getDiagnostics(): TempDiagnostics {
    const active = Object.values(this.index).filter(r => r.status === 'ACTIVE');
    
    let largestModule = 'none';
    const modSizes: Record<string, number> = {};
    active.forEach(r => {
      modSizes[r.module] = (modSizes[r.module] || 0) + r.size;
    });
    const maxMod = Object.entries(modSizes).sort((a,b) => b[1] - a[1])[0];
    if (maxMod) largestModule = maxMod[0];

    const currentTempSize = this.getCurrentTempSize();

    return {
      currentTempSize,
      totalFiles: active.length,
      largestModule,
      oldestFile: active.length > 0 ? Math.min(...active.map(r => r.createdTime)) : 0,
      newestFile: active.length > 0 ? Math.max(...active.map(r => r.createdTime)) : 0,
      recoveredSpace: this.recoveredSpaceBytes,
      diskUsagePercent: (currentTempSize / this.quotaBytes) * 100,
      lastCleanupTime: this.lastCleanupTime
    };
  }
}
