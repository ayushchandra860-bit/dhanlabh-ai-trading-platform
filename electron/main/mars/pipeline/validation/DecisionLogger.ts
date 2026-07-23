import { DecisionLogEntry } from './ValidationTypes';
import { LoggerService } from '../../../LoggerService';

export class DecisionLogger {
  private logs: DecisionLogEntry[] = [];

  public logDecision(entry: DecisionLogEntry): void {
    this.logs.push(entry);
  }

  public getLogs(): DecisionLogEntry[] {
    return this.logs;
  }

  public clear(): void {
    this.logs = [];
  }

  public getLogsByTimeRange(startTime: number, endTime: number): DecisionLogEntry[] {
    return this.logs.filter(l => l.timestamp >= startTime && l.timestamp <= endTime);
  }
}
