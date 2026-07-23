import { IStartable } from './IStartable';
import { IStoppable } from './IStoppable';

export interface ILifecycleManager {
  register(name: string, service: IStartable & IStoppable, dependencies?: string[]): void;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}
