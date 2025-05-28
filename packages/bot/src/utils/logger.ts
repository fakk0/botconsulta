// Sistema de logging
import { LogLevel } from '@bot-consulta/shared';

export class Logger {
  constructor(private component: string) {}
  
  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.component}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}