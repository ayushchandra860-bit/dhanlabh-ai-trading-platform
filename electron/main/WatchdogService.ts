import { LoggerService } from './LoggerService';

export enum RecoveryLevel {
  NONE = 0,
  DETECTED = 1,
  GRACEFUL_RESTART = 2,
  REINITIALIZE = 3,
  FULL_PIPELINE_RESTART = 4
}

interface WatchdogEntry {
  moduleName: string;
  lastHeartbeat: number;
  timeoutMs: number;
  recoveryLevel: RecoveryLevel;
  onRecover: (level: RecoveryLevel) => Promise<boolean>;
}

export class WatchdogService {
  private static instance: WatchdogService;
  private entries: Map<string, WatchdogEntry> = new Map();
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRecovering: boolean = false;

  private constructor() {
    this.startMonitor();
  }

  public static getInstance(): WatchdogService {
    if (!WatchdogService.instance) {
      WatchdogService.instance = new WatchdogService();
    }
    return WatchdogService.instance;
  }

  public register(
    moduleName: string, 
    timeoutMs: number, 
    onRecover: (level: RecoveryLevel) => Promise<boolean>
  ) {
    this.entries.set(moduleName, {
      moduleName,
      lastHeartbeat: Date.now(),
      timeoutMs,
      recoveryLevel: RecoveryLevel.NONE,
      onRecover
    });
    LoggerService.info(`[WATCHDOG] Registered module: ${moduleName} with timeout ${timeoutMs}ms`);
  }

  public ping(moduleName: string) {
    const entry = this.entries.get(moduleName);
    if (entry) {
      entry.lastHeartbeat = Date.now();
      if (entry.recoveryLevel !== RecoveryLevel.NONE) {
        LoggerService.info(`[WATCHDOG] Module ${moduleName} recovered and is pinging normally.`);
        entry.recoveryLevel = RecoveryLevel.NONE;
      }
    }
  }

  public unregister(moduleName: string) {
    this.entries.delete(moduleName);
  }

  private startMonitor() {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(() => this.checkHealth(), 2000);
  }

  private async checkHealth() {
    if (this.isRecovering) return; // Prevent overlapping recoveries

    const now = Date.now();
    for (const [moduleName, entry] of this.entries.entries()) {
      if (now - entry.lastHeartbeat > entry.timeoutMs) {
        await this.initiateRecovery(entry);
      }
    }
  }

  private async initiateRecovery(entry: WatchdogEntry) {
    this.isRecovering = true;
    try {
      const now = Date.now();
      let nextLevel = entry.recoveryLevel + 1;
      
      if (nextLevel > RecoveryLevel.FULL_PIPELINE_RESTART) {
        nextLevel = RecoveryLevel.FULL_PIPELINE_RESTART;
      }

      entry.recoveryLevel = nextLevel;

      LoggerService.warn(`[WATCHDOG] STALLED DETECTED: ${entry.moduleName}. Initiating Recovery Level ${nextLevel}.`);

      const success = await entry.onRecover(nextLevel);

      if (success) {
        LoggerService.info(`[WATCHDOG] Recovery Level ${nextLevel} successful for ${entry.moduleName}.`);
        entry.lastHeartbeat = Date.now(); // reset heartbeat
      } else {
        LoggerService.error(`[WATCHDOG] Recovery Level ${nextLevel} FAILED for ${entry.moduleName}. Escalating on next tick.`);
      }
    } catch (e) {
      LoggerService.error(`[WATCHDOG] Exception during recovery of ${entry.moduleName}: ${e}`);
    } finally {
      this.isRecovering = false;
    }
  }
}
