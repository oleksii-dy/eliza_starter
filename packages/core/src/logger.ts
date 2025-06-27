/**
 * Simple cross-platform logger that works in both Node.js and browsers
 */

// Type declaration for browser window
declare const window: { localStorage?: Storage } | undefined;

// Log levels
export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  SUCCESS = 27,
  PROGRESS = 28,
  LOG = 29,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

// Level names for display
const levelNames: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  27: 'SUCCESS',
  28: 'PROGRESS',
  29: 'LOG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};

// Color codes for different levels (ANSI codes for terminal, ignored in browser)
const levelColors: Record<number, string> = {
  10: '\x1b[90m',     // TRACE - gray
  20: '\x1b[35m',     // DEBUG - magenta
  27: '\x1b[92m',     // SUCCESS - bright green
  28: '\x1b[36m',     // PROGRESS - cyan
  29: '\x1b[32m',     // LOG - green
  30: '\x1b[34m',     // INFO - blue
  40: '\x1b[33m',     // WARN - yellow
  50: '\x1b[31m',     // ERROR - red
  60: '\x1b[91m',     // FATAL - bright red
};

const RESET = '\x1b[0m';

interface LogEntry {
  time: number;
  level: number;
  msg: string;
  [key: string]: any;
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private useColors = true;
  
  constructor() {
    // Set log level from environment
    if (typeof process !== 'undefined' && process.env) {
      const envLevel = process.env.LOG_LEVEL?.toLowerCase();
      if (envLevel === 'trace') this.level = LogLevel.TRACE;
      else if (envLevel === 'debug') this.level = LogLevel.DEBUG;
      else if (envLevel === 'info') this.level = LogLevel.INFO;
      else if (envLevel === 'warn') this.level = LogLevel.WARN;
      else if (envLevel === 'error') this.level = LogLevel.ERROR;
      else if (envLevel === 'fatal') this.level = LogLevel.FATAL;
      
      // Check if we should use colors
      this.useColors = process.env.NO_COLOR !== '1' && process.env.FORCE_COLOR !== '0';
    }
    
    // In browser, check localStorage for log level
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedLevel = window.localStorage.getItem('LOG_LEVEL');
      if (storedLevel) {
        const level = parseInt(storedLevel);
        if (!isNaN(level)) this.level = level;
      }
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }
  
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = levelNames[level] || 'UNKNOWN';
    
    let formatted = `${timestamp} [${levelName}] ${message}`;
    
    if (data && Object.keys(data).length > 0) {
      formatted += ' ' + JSON.stringify(data);
    }
    
    // Add colors if in terminal
    if (this.useColors && typeof process !== 'undefined') {
      const color = levelColors[level] || '';
      formatted = `${color}${formatted}${RESET}`;
    }
    
    return formatted;
  }
  
  private writeLog(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;
    
    // Extract data object if provided
    let data: any = {};
    const messageParts: string[] = [message];
    
    for (const arg of args) {
      if (typeof arg === 'string') {
        messageParts.push(arg);
      } else if (typeof arg === 'object' && arg !== null) {
        if (arg instanceof Error) {
          data.error = {
            message: arg.message,
            stack: arg.stack,
          };
        } else {
          Object.assign(data, arg);
        }
      }
    }
    
    const fullMessage = messageParts.join(' ');
    const logEntry: LogEntry = {
      time: Date.now(),
      level,
      msg: fullMessage,
      ...data,
    };
    
    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Output to console
    const formatted = this.formatMessage(level, fullMessage, Object.keys(data).length > 0 ? data : undefined);
    
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level >= LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
  
  // Log methods
  trace(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.TRACE, message, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.DEBUG, message, ...args);
  }
  
  success(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.SUCCESS, message, ...args);
  }
  
  progress(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.PROGRESS, message, ...args);
  }
  
  log(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.LOG, message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.INFO, message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.WARN, message, ...args);
  }
  
  error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      this.writeLog(LogLevel.ERROR, message.message, message, ...args);
    } else {
      this.writeLog(LogLevel.ERROR, message, ...args);
    }
  }
  
  fatal(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.FATAL, message, ...args);
  }
  
  // Get recent logs
  recentLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  // Clear logs
  clear(): void {
    this.logs = [];
  }
  
  // Set log level
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  // Get current log level
  getLevel(): LogLevel {
    return this.level;
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Create logger factory function for compatibility
export function createLogger(bindings?: any): Logger {
  const newLogger = new Logger();
  if (bindings) {
    // In the simple logger, we'll just add bindings to all log methods
    // This is a simplified approach
    const methods: Array<keyof Logger> = ['trace', 'debug', 'success', 'progress', 'log', 'info', 'warn', 'error', 'fatal'];
    
    for (const method of methods) {
      const original = (newLogger as any)[method].bind(newLogger);
      (newLogger as any)[method] = function(message: string, ...args: any[]) {
        // Merge bindings into the first data argument
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Error)) {
          args[0] = { ...bindings, ...args[0] };
        } else {
          args.unshift(bindings);
        }
        original(message, ...args);
      };
    }
  }
  return newLogger;
}

// For backward compatibility
export const elizaLogger = logger;
export default logger; 