import { ILifecycleManager } from '../interfaces/ILifecycleManager';

export class ShutdownManager {
  private lifecycle: ILifecycleManager;
  private timeoutMs: number;

  constructor(lifecycle: ILifecycleManager, timeoutMs: number = 5000) {
    this.lifecycle = lifecycle;
    this.timeoutMs = timeoutMs;
  }

  public registerHandlers(): void {
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      console.error('[MARS FATAL] Uncaught Exception:', err);
      this.handleShutdown('uncaughtException', 1);
    });
  }

  private async handleShutdown(signal: string, exitCode: number = 0): Promise<void> {
    console.log(`\n[MARS Shutdown] Received ${signal}. Initiating graceful teardown...`);

    // Force exit if teardown takes too long
    const forceExitTimer = setTimeout(() => {
      console.error(`[MARS Shutdown] Graceful teardown timed out after ${this.timeoutMs}ms. Forcing exit.`);
      process.exit(1);
    }, this.timeoutMs);

    try {
      await this.lifecycle.stopAll();
      clearTimeout(forceExitTimer);
      console.log('[MARS Shutdown] Teardown complete. Exiting gracefully.');
      process.exit(exitCode);
    } catch (err) {
      console.error('[MARS Shutdown] Error during graceful teardown:', err);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }
}
