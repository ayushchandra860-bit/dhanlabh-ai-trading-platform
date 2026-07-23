import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';
import crypto from 'crypto';

export class MarketLaboratory {
  constructor() {
    eventBus.subscribe(MarsEventTypes.EXPERIMENT_STARTED, this.onExperiment.bind(this), 'MarketLaboratory');
  }

  private async onExperiment(event: MarsEvent) {
    const data = event.payload;
    const hypothesisId = crypto.randomUUID();
    
    // Simplistic hypothesis generation
    const events = data.baseData?.detectedEvents || [];
    const eventString = events.length > 0 ? events.join(' + ') : 'Unknown setup';
    const hypothesis = `If ${eventString} occurs, the most likely outcome is Continuation.`;
    
    eventBus.publish(MarsEventTypes.HYPOTHESIS_GENERATED, {
      hypothesisId,
      experimentId: data.experimentId,
      text: hypothesis,
      scenarios: data.scenarios,
      context: data.baseData
    });
  }
}

export const marketLaboratory = new MarketLaboratory();
