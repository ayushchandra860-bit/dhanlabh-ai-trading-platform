import { IServiceContainer } from '../interfaces/IServiceContainer';

export class ServiceContainer implements IServiceContainer {
  private instances = new Map<string, any>();
  private factories = new Map<string, (container: IServiceContainer) => any>();
  private resolving = new Set<string>();

  public register<T>(key: string, instance: T): void {
    if (this.instances.has(key) || this.factories.has(key)) {
      throw new Error(`Service already registered for key: ${key}`);
    }
    this.instances.set(key, instance);
  }

  public registerFactory<T>(key: string, factory: (container: IServiceContainer) => T): void {
    if (this.instances.has(key) || this.factories.has(key)) {
      throw new Error(`Service already registered for key: ${key}`);
    }
    this.factories.set(key, factory);
  }

  public resolve<T>(key: string): T {
    if (this.resolving.has(key)) {
      throw new Error(`Circular dependency detected while resolving: ${key}`);
    }

    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    if (this.factories.has(key)) {
      this.resolving.add(key);
      try {
        const factory = this.factories.get(key)!;
        const instance = factory(this);
        // By default, factories act as singletons after first resolution in this implementation
        this.instances.set(key, instance);
        return instance as T;
      } finally {
        this.resolving.delete(key);
      }
    }

    throw new Error(`Service not registered for key: ${key}`);
  }

  public has(key: string): boolean {
    return this.instances.has(key) || this.factories.has(key);
  }

  public clear(): void {
    this.instances.clear();
    this.factories.clear();
    this.resolving.clear();
  }
}
