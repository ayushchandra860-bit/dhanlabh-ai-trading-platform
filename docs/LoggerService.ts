import { app } from 'electron';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [${app.getName()}]`, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }
}

export const LoggerService = new Logger();