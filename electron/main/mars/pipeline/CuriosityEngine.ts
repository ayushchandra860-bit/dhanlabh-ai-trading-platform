import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';

export class CuriosityEngine {
  constructor() {
    eventBus.subscribe(MarsEventTypes.OBSERVATION_CREATED, this.onObservation.bind(this), 'CuriosityEngine');
  }

  private async onObservation(event: MarsEvent) {
    const data = event.payload;
    // Generate questions for MarketExperimentEngine
    const questions = [
      'Could there be another explanation?',
      'Can identical structures produce different outcomes?'
    ];
    
    eventBus.publish(MarsEventTypes.RESEARCH_TRIGGERED, {
      ...data,
      questions
    });
  }
}

export const curiosityEngine = new CuriosityEngine();
