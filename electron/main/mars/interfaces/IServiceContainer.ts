export interface IServiceContainer {
  /**
   * Register a singleton instance.
   */
  register<T>(key: string, instance: T): void;

  /**
   * Register a factory function for lazy instantiation or transient resolution.
   */
  registerFactory<T>(key: string, factory: (container: IServiceContainer) => T): void;

  /**
   * Resolve an instance by its key.
   * Throws an error if the key is not registered or if a circular dependency is detected.
   */
  resolve<T>(key: string): T;

  /**
   * Check if a service is registered.
   */
  has(key: string): boolean;

  /**
   * Clear all registered services.
   */
  clear(): void;
}
