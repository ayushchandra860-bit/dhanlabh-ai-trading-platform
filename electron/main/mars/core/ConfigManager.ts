import { IConfigManager, EnvironmentProfile } from '../interfaces/IConfigManager';

export class ConfigManager implements IConfigManager {
  private profile: EnvironmentProfile;
  private config: Map<string, any>;

  constructor() {
    this.profile = (process.env.MARS_ENV as EnvironmentProfile) || 'Development';
    this.config = new Map<string, any>();
    this.loadProfileDefaults();
  }

  private loadProfileDefaults() {
    // Set global logging and performance constraints based on profile
    switch (this.profile) {
      case 'Production':
        this.config.set('logging.level', 'error');
        this.config.set('performance.maxQueueDepth', 10000);
        this.config.set('safety.strictValidation', true);
        break;
      case 'Testing':
      case 'Development':
      default:
        this.config.set('logging.level', 'debug');
        this.config.set('performance.maxQueueDepth', 1000);
        this.config.set('safety.strictValidation', true);
        break;
    }
  }

  public getProfile(): EnvironmentProfile {
    return this.profile;
  }

  public get<T>(key: string, defaultValue?: T): T {
    if (this.config.has(key)) {
      return this.config.get(key) as T;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Configuration key not found: ${key}`);
  }

  public isDev(): boolean {
    return this.profile === 'Development';
  }

  public isProd(): boolean {
    return this.profile === 'Production';
  }
}
