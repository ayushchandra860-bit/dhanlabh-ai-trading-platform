import { eventBus } from '../core/MarsEventBus';
import { MarsEvent, MarsEventTypes } from '../interfaces/IEvents';
import { MarsSQLiteAdapter } from '../db/MarsSQLiteAdapter';
import crypto from 'crypto';

export class ResearchJournal {
  constructor(private db: MarsSQLiteAdapter) {
    eventBus.subscribe(MarsEventTypes.KNOWLEDGE_UPDATED, this.onKnowledgeUpdate.bind(this), 'ResearchJournal');
  }

  private async onKnowledgeUpdate(event: MarsEvent) {
    const data = event.payload;
    const entryId = crypto.randomUUID();
    
    await this.db.saveJournalEntry({
      id: entryId,
      timestamp: Date.now(),
      marketSnapshotRef: 'session-memory-ref', // Sandbox runs in memory
      observation: JSON.stringify(data.context?.detectedEvents || []),
      hypothesis: data.text,
      evidence: data.isSuccess ? 'Supporting' : 'Contradicting',
      reflection: data.reflection,
      conclusion: data.isSuccess ? 'Promoted' : 'Rejected',
      knowledgeLinks: JSON.stringify([]),
      tags: JSON.stringify(data.context?.detectedEvents || [])
    });
  }
}
