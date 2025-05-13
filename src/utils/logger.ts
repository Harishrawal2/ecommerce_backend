enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level based on environment variable or default to INFO
    const configLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    
    switch (configLevel) {
      case 'error':
        this.level = LogLevel.ERROR;
        break;
      case 'warn':
        this.level = LogLevel.WARN;
        break;
      case 'info':
        this.level = LogLevel.INFO;
        break;
      case 'debug':
        this.level = LogLevel.DEBUG;
        break;
      default:
        this.level = LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: any, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedMessage = typeof message === 'object' 
      ? JSON.stringify(message) 
      : message;
    
    let fullMessage = `[${timestamp}] [${level}] ${formattedMessage}`;
    
    if (args.length > 0) {
      args.forEach(arg => {
        if (arg instanceof Error) {
          fullMessage += `\n${arg.stack || arg.message}`;
        } else if (typeof arg === 'object') {
          fullMessage += `\n${JSON.stringify(arg)}`;
        } else {
          fullMessage += ` ${arg}`;
        }
      });
    }
    
    return fullMessage;
  }

  error(message: any, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message: any, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message: any, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

export const logger = new Logger();