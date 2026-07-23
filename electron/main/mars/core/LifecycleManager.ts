import { ILifecycleManager } from '../interfaces/ILifecycleManager';
import { IStartable } from '../interfaces/IStartable';
import { IStoppable } from '../interfaces/IStoppable';

interface ServiceNode {
  name: string;
  service: IStartable & IStoppable;
  dependencies: string[];
}

export class LifecycleManager implements ILifecycleManager {
  private services = new Map<string, ServiceNode>();
  private started = false;

  public register(name: string, service: IStartable & IStoppable, dependencies: string[] = []): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered in LifecycleManager.`);
    }
    this.services.set(name, { name, service, dependencies });
  }

  public async startAll(): Promise<void> {
    if (this.started) return;

    const sorted = this.topologicalSort();
    for (const node of sorted) {
      console.log(`[MARS Boot] Starting ${node.name}...`);
      await node.service.start();
    }
    
    this.started = true;
    console.log(`[MARS Boot] All services started successfully.`);
  }

  public async stopAll(): Promise<void> {
    if (!this.started) return;

    // Stop in reverse topological order
    const sorted = this.topologicalSort().reverse();
    for (const node of sorted) {
      console.log(`[MARS Shutdown] Stopping ${node.name}...`);
      try {
        await node.service.stop();
      } catch (err) {
        console.error(`[MARS Shutdown] Error stopping ${node.name}:`, err);
      }
    }

    this.started = false;
    console.log(`[MARS Shutdown] All services stopped safely.`);
  }

  private topologicalSort(): ServiceNode[] {
    const sorted: ServiceNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected in lifecycle: ${name}`);
      }

      visiting.add(name);

      const node = this.services.get(name);
      if (!node) {
        throw new Error(`Missing dependency in lifecycle: ${name}`);
      }

      for (const dep of node.dependencies) {
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(node);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    return sorted;
  }
}
