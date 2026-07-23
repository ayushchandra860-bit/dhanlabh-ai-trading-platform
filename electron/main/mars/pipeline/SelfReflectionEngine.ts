import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';

export class SelfReflectionEngine {
  constructor() {
    eventBus.subscribe(MarsEventTypes.EXPERIMENT_RESOLVED, this.onResolution.bind(this), 'SelfReflectionEngine');
  }

  private async onResolution(event: MarsEvent) {
    const data = event.payload;
    const isSuccess = data.predictedScenario === data.actualOutcome;
    
    let reflection = '';
    if (isSuccess) {
      reflection = `Hypothesis validated. ${data.predictedScenario} occurred as expected due to strong confluence.`;
    } else {
      reflection = `Hypothesis rejected. Expected ${data.predictedScenario}, but got ${data.actualOutcome}. Possible hidden resistance ignored.`;
    }

    eventBus.publish(MarsEventTypes.KNOWLEDGE_UPDATED, {
      ...data,
      isSuccess,
      reflection
    });
  }
}

export const selfReflectionEngine = new SelfReflectionEngine();
