import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';

export class EvidenceCollector {
  private activeHypotheses = new Map<string, any>();

  constructor() {
    eventBus.subscribe(MarsEventTypes.HYPOTHESIS_GENERATED, this.onHypothesis.bind(this), 'EvidenceCollector');
    // We also listen to future observations to resolve the hypothesis
    eventBus.subscribe(MarsEventTypes.OBSERVATION_CREATED, this.onFutureObservation.bind(this), 'EvidenceCollector');
  }

  private async onHypothesis(event: MarsEvent) {
    const data = event.payload;
    this.activeHypotheses.set(data.hypothesisId, {
      ...data,
      startTime: Date.now()
    });
  }

  private async onFutureObservation(event: MarsEvent) {
    const now = Date.now();
    for (const [id, hypothesis] of this.activeHypotheses.entries()) {
      // In a real system, we'd wait 5-15 mins before resolving.
      // For architecture demonstration, we resolve immediately if a contrasting event is seen.
      if (now - hypothesis.startTime > 300000) { // 5 minutes simulation
        const actualOutcome = 'Reversal'; // Simulated outcome from future data
        
        eventBus.publish(MarsEventTypes.EXPERIMENT_RESOLVED, {
          hypothesisId: id,
          experimentId: hypothesis.experimentId,
          predictedScenario: hypothesis.scenarios[0].outcome,
          actualOutcome,
          context: hypothesis.context,
          text: hypothesis.text
        });
        
        this.activeHypotheses.delete(id);
      }
    }
  }
}

export const evidenceCollector = new EvidenceCollector();
