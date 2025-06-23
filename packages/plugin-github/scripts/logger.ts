import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';
import { format } from 'util';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logStream?: NodeJS.WritableStream;
  private logDir: string;

  private constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logDir = process.env.LOG_DIR || join(process.cwd(), 'logs');

    if (this.logToFile) {
      this.initializeFileLogging();
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
        return LogLevel.NONE;
      default:
        return LogLevel.INFO;
    }
  }

  private initializeFileLogging(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(this.logDir, `plugin-scripts-${timestamp}.log`);
    this.logStream = createWriteStream(logFile, { flags: 'a' });
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, data, error } = entry;
    let formatted = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      formatted += ` ${JSON.stringify(data, null, 2)}`;
    }

    if (error) {
      formatted += `\n${error.stack || error.message}`;
    }

    return formatted;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      data,
    };

    if (data instanceof Error) {
      entry.error = data;
      entry.data = undefined;
    }

    const formatted = this.formatLogEntry(entry);

    // Console output with color
    switch (level) {
      case LogLevel.DEBUG:
        console.debug('\x1b[36m%s\x1b[0m', formatted); // Cyan
        break;
      case LogLevel.INFO:
        console.info('\x1b[32m%s\x1b[0m', formatted); // Green
        break;
      case LogLevel.WARN:
        console.warn('\x1b[33m%s\x1b[0m', formatted); // Yellow
        break;
      case LogLevel.ERROR:
        console.error('\x1b[31m%s\x1b[0m', formatted); // Red
        break;
    }

    // File output
    if (this.logToFile && this.logStream) {
      this.logStream.write(formatted + '\n');
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  // Structured logging methods
  startOperation(operation: string, data?: any): void {
    this.info(`Starting ${operation}`, data);
  }

  endOperation(operation: string, data?: any): void {
    this.info(`Completed ${operation}`, data);
  }

  progress(operation: string, current: number, total: number, data?: any): void {
    const percentage = Math.round((current / total) * 100);
    this.info(`${operation} progress: ${current}/${total} (${percentage}%)`, data);
  }

  // Close log stream when done
  close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Ensure cleanup on exit
process.on('exit', () => {
  logger.close();
});

process.on('SIGINT', () => {
  logger.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.close();
  process.exit(0);
}); 