import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { LoggerService } from './LoggerService';

export class StorageService {
  private static instance: StorageService;
  private dataPath: string;
  private data: Record<string, any> = {};

  private constructor() {
    // userData is %APPDATA% on Windows, ~/.config on Linux, ~/Library/Application Support on macOS
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'dhanlabh-store.json');
    this.load();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
        this.data = JSON.parse(fileContent);
      }
    } catch (error) {
      LoggerService.error('Failed to load store data', error);
      this.data = {};
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      LoggerService.error('Failed to save store data', error);
    }
  }

  public get<T>(key: string, defaultValue?: T): T {
    if (this.data[key] !== undefined) {
      return this.data[key] as T;
    }
    return defaultValue as T;
  }

  public set(key: string, value: any): void {
    this.data[key] = value;
    this.save();
  }
}
