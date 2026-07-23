import { LoggerService } from '../../../LoggerService';

export type TaskPriority = 'CRITICAL_TRADE' | 'HIGH_MARKET_UPDATE' | 'LOW_RESEARCH';

export interface QueuedTask {
  id: string;
  priority: TaskPriority;
  payload: any;
  execute: () => Promise<void>;
}

export class PriorityQueueEngine {
  private queue: QueuedTask[] = [];
  private isProcessing = false;

  /**
   * Enqueues a task and sorts the queue to ensure CRITICAL_TRADE tasks always jump to the front.
   */
  public enqueue(task: QueuedTask): void {
    this.queue.push(task);
    
    // Simple sort: CRITICAL_TRADE first, then HIGH, then LOW.
    this.queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task.execute();
        } catch (err) {
          LoggerService.error(`[MARS Queue] Task ${task.id} failed: ${err}`);
        }
      }
    }
    this.isProcessing = false;
  }

  private getPriorityWeight(p: TaskPriority): number {
    switch (p) {
      case 'CRITICAL_TRADE': return 3;
      case 'HIGH_MARKET_UPDATE': return 2;
      case 'LOW_RESEARCH': return 1;
      default: return 0;
    }
  }
}
