import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';
import { LoggerService } from '../../LoggerService';

export class EvaluationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 5 * 60 * 1000; // 5 minutes default
  private onEvaluateCb: (() => Promise<void>) | null = null;

  constructor() {
    eventBus.subscribe(MarsEventTypes.OBSERVATION_CREATED, this.handleObservation.bind(this), 'EvaluationScheduler');
  }

  public setCallback(cb: () => Promise<void>) {
    this.onEvaluateCb = cb;
  }

  public start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.triggerEvaluation('Scheduled'), this.intervalMs);
    LoggerService.info(`[MARS Scheduler] Started with interval ${this.intervalMs}ms`);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async triggerEvaluation(reason: string) {
    if (this.onEvaluateCb) {
      LoggerService.info(`[MARS Scheduler] Triggering evaluation. Reason: ${reason}`);
      await this.onEvaluateCb();
    }
  }

  private async handleObservation(event: MarsEvent) {
    const data = event.payload;
    const events: string[] = data.detectedEvents || [];
    
    // Extraordinary event check
    const isExtraordinary = events.some(e => 
      e.includes('SWEEP') || 
      e.includes('CHOCH') || 
      e.includes('STRONG')
    );

    if (isExtraordinary) {
      LoggerService.info(`[MARS Scheduler] Extraordinary event detected: ${events.join(', ')}`);
      // Reset timer and trigger immediately
      this.start();
      this.triggerEvaluation('Extraordinary Event Interrupt');
    }
  }
}

export const evaluationScheduler = new EvaluationScheduler();
