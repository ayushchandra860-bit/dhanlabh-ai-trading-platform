import { EventEmitter } from 'events';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';
import { LoggerService } from '../../LoggerService';

export type MarsEventHandler = (event: MarsEvent) => Promise<void> | void;

interface Subscription {
  subscriberName: string;
  handler: (event: MarsEvent) => void;
}

export class MarsEventBus {
  private static instance: MarsEventBus;
  private emitter: EventEmitter;
  
  // Maps event type to an array of active subscriptions to enable safe unsubscribing
  private subscriptions: Map<MarsEventTypes, Subscription[]> = new Map();
  
  // DLQ (Dead Letter Queue) for failed events
  private dlq: Array<{ event: MarsEvent; error: any }> = [];
  
  // Backpressure configuration
  private maxQueueDepth: number = 5000;
  private currentQueueDepth: number = 0;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public static getInstance(): MarsEventBus {
    if (!MarsEventBus.instance) {
      MarsEventBus.instance = new MarsEventBus();
    }
    return MarsEventBus.instance;
  }

  /**
   * Subscribes a module to an event and returns a subscription ID or unsubscribe function.
   */
  public subscribe(type: MarsEventTypes, handler: MarsEventHandler, subscriberName: string): () => void {
    const wrappedHandler = async (event: MarsEvent) => {
      try {
        await handler(event);
      } catch (error) {
        LoggerService.error(`[MARS FAIL-SAFE] Module '${subscriberName}' crashed during event '${type}': ${error}`);
        // Route to Dead Letter Queue
        this.routeToDLQ(event, error);
      }
    };

    this.emitter.on(type, wrappedHandler);

    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }
    this.subscriptions.get(type)!.push({ subscriberName, handler: wrappedHandler });

    LoggerService.info(`[MARS EDA] ${subscriberName} subscribed to ${type}`);

    // Return explicit unsubscribe hook
    return () => this.unsubscribe(type, subscriberName, wrappedHandler);
  }

  /**
   * Explicitly removes a subscription to prevent memory leaks.
   */
  public unsubscribe(type: MarsEventTypes, subscriberName: string, wrappedHandler: (event: MarsEvent) => void): void {
    this.emitter.off(type, wrappedHandler);
    
    const subs = this.subscriptions.get(type);
    if (subs) {
      this.subscriptions.set(type, subs.filter(s => s.handler !== wrappedHandler));
    }
    
    LoggerService.info(`[MARS EDA] ${subscriberName} unsubscribed from ${type}`);
  }

  /**
   * Publishes an event with backpressure controls.
   */
  public publish(type: MarsEventTypes, payload: any): void {
    if (this.currentQueueDepth >= this.maxQueueDepth) {
      LoggerService.warn(`[MARS EDA] Backpressure limit reached (${this.maxQueueDepth}). Dropping event ${type}`);
      return;
    }

    const event: MarsEvent = {
      type,
      payload,
      timestamp: Date.now()
    };
    
    this.currentQueueDepth++;
    
    setImmediate(() => {
      try {
        this.emitter.emit(type, event);
      } finally {
        this.currentQueueDepth--;
      }
    });
  }

  private routeToDLQ(event: MarsEvent, error: any): void {
    this.dlq.push({ event, error });
    // Prevent unbounded DLQ growth
    if (this.dlq.length > 1000) {
      this.dlq.shift();
    }
  }

  public getDLQ(): Array<{ event: MarsEvent; error: any }> {
    return [...this.dlq];
  }
}

export const eventBus = MarsEventBus.getInstance();

