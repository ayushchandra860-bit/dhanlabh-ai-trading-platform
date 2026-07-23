import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';
import crypto from 'crypto';

export class MarketExperimentEngine {
  constructor() {
    eventBus.subscribe(MarsEventTypes.RESEARCH_TRIGGERED, this.onResearchTrigger.bind(this), 'MarketExperimentEngine');
  }

  private async onResearchTrigger(event: MarsEvent) {
    const data = event.payload;
    const experimentId = crypto.randomUUID();
    
    const scenarios = [
      { name: 'Scenario A', outcome: 'Continuation', probability: 0.33 },
      { name: 'Scenario B', outcome: 'Reversal', probability: 0.33 },
      { name: 'Scenario C', outcome: 'Consolidation', probability: 0.33 }
    ];

    eventBus.publish(MarsEventTypes.EXPERIMENT_STARTED, {
      experimentId,
      timestamp: Date.now(),
      baseData: data,
      scenarios
    });
  }
}

export const marketExperimentEngine = new MarketExperimentEngine();
