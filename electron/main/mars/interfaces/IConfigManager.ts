export type EnvironmentProfile = 'Development' | 'Research' | 'Testing' | 'Demo' | 'Production';

export interface IConfigManager {
  getProfile(): EnvironmentProfile;
  get<T>(key: string, defaultValue?: T): T;
  isDev(): boolean;
  isProd(): boolean;
}
