import adze, { Adze } from 'adze';
import { Sentry } from './sentry/instrument';

// Local utility function to avoid circular dependency
function parseBooleanFromText(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

/**
 * Interface representing a log entry.
 * @property {number} [time] - The timestamp of the log entry.
 * @property {unknown} [key] - Additional properties that can be added to the log entry.
 */
/**
 * Interface representing a log entry.
 * @typedef {Object} LogEntry
 * @property {number} [time] - The time the log entry was created.
 * @property {string} key - The key for the log entry.
 * @property {unknown} value - The value associated with the key in the log entry.
 */
interface LogEntry {
  time?: number;
  level?: number;
  msg?: string;
  [key: string]: unknown;
}

// Custom destination that maintains recent logs in memory
/**
 * Class representing an in-memory destination for logging with adze.
 * Maintains a buffer of recent logs and handles filtering.
 */
class InMemoryDestination {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs

  /**
   * Constructor for creating a new instance of the class.
   */
  constructor() {}

  /**
   * Writes a log entry to the memory buffer.
   *
   * @param {LogEntry} logEntry - The log entry to be written.
   * @returns {void}
   */
  write(logEntry: LogEntry): void {
    // Add timestamp if not present
    if (!logEntry.time) {
      logEntry.time = Date.now();
    }

    // Filter out service registration logs unless in debug mode
    const isDebugMode = (process?.env?.LOG_LEVEL || '').toLowerCase() === 'debug';
    const isLoggingDiagnostic = Boolean(process?.env?.LOG_DIAGNOSTIC);

    if (isLoggingDiagnostic) {
      // When diagnostic mode is on, add a marker to every log to see what's being processed
      logEntry.diagnostic = true;
    }

    if (!isDebugMode) {
      // Check if this is a service or agent log that we want to filter
      if (logEntry.agentName && logEntry.agentId) {
        const msg = logEntry.msg || '';
        // Filter only service/agent registration logs, not all agent logs
        if (
          typeof msg === 'string' &&
          (msg.includes('registered successfully') ||
            msg.includes('Registering') ||
            msg.includes('Success:') ||
            msg.includes('linked to') ||
            msg.includes('Started'))
        ) {
          if (isLoggingDiagnostic) {
            console.error('Filtered log:', JSON.stringify(logEntry));
          }
          // This is a service registration/agent log, skip it
          return;
        }
      }
    }

    // Add to memory buffer
    this.logs.push(logEntry);

    // Maintain buffer size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Retrieves the recent logs from the system.
   *
   * @returns {LogEntry[]} An array of LogEntry objects representing the recent logs.
   */
  recentLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Clears all logs from memory.
   *
   * @returns {void}
   */
  clear(): void {
    this.logs = [];
  }
}

// Map pino levels to adze-compatible levels
const customLevels: Record<string, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  log: 29,
  progress: 28,
  success: 27,
  debug: 20,
  trace: 10,
};

// Level name mapping for display
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

// Color mapping for different levels
const levelColors: Record<number, string> = {
  60: '\x1b[31m', // red - fatal
  50: '\x1b[31m', // red - error
  40: '\x1b[33m', // yellow - warn
  30: '\x1b[34m', // blue - info
  29: '\x1b[32m', // green - log
  28: '\x1b[36m', // cyan - progress
  27: '\x1b[92m', // bright green - success
  20: '\x1b[35m', // magenta - debug
  10: '\x1b[90m', // grey - trace
};

const raw = parseBooleanFromText(process?.env?.LOG_JSON_FORMAT) || false;

// Set default log level to info to allow regular logs, but still filter service logs
const isDebugMode = (process?.env?.LOG_LEVEL || '').toLowerCase() === 'debug';
const effectiveLogLevel = isDebugMode ? 'debug' : process?.env?.DEFAULT_LOG_LEVEL || 'info';

// Check if user wants timestamps in logs (default: true)
const showTimestamps =
  process?.env?.LOG_TIMESTAMPS !== undefined
    ? parseBooleanFromText(process?.env?.LOG_TIMESTAMPS)
    : true;

// Create the in-memory destination
const memoryDestination = new InMemoryDestination();

/**
 * ElizaLogger class that wraps adze to provide pino-compatible API
 */
class ElizaLogger {
  private adzeInstance: Adze;
  private bindings: Record<string, unknown> = {};
  private logLevel: string;

  constructor(bindings: Record<string, unknown> = {}, logLevel?: string) {
    this.bindings = bindings;
    this.logLevel = logLevel || effectiveLogLevel;
    
    // Configure adze instance
    this.adzeInstance = adze({
      level: this.getAdzeLevel(this.logLevel),
      format: raw ? 'json' : 'standard',
      useEmoji: false,
      silent: false,
    });
  }

  private getAdzeLevel(level: string): number {
    return customLevels[level] || 30;
  }

  private formatMessage(level: number, message: string, ...args: unknown[]): void {
    const entry: LogEntry = {
      time: Date.now(),
      level,
      msg: message,
      ...this.bindings,
    };

    // Handle additional arguments
    if (args.length > 0) {
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
          Object.assign(entry, arg);
        }
      }
    }

    // Write to in-memory destination
    memoryDestination.write(entry);

    // Handle Sentry integration
    if (process.env.SENTRY_LOGGING !== 'false') {
      for (const arg of [message, ...args]) {
        if (arg instanceof Error) {
          Sentry.captureException(arg);
        }
      }
    }

    // Format and output the log
    this.outputLog(level, message, args);
  }

  private outputLog(level: number, message: string, args: unknown[]): void {
    if (raw) {
      // JSON format
      const entry: LogEntry = {
        time: Date.now(),
        level,
        msg: message,
        ...this.bindings,
      };
      console.log(JSON.stringify(entry));
      return;
    }

    // Pretty format
    const levelName = levelNames[level] || `LEVEL${level}`;
    const color = levelColors[level] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    let output = '';
    
    if (showTimestamps) {
      const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
      output += `${timestamp} `;
    }
    
    output += `${color}${levelName}${reset}: ${message}`;
    
    // Add bindings if any
    if (Object.keys(this.bindings).length > 0) {
      const bindingsStr = Object.entries(this.bindings)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      output += ` (${bindingsStr})`;
    }
    
    // Add additional arguments
    if (args.length > 0) {
      const argsStr = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      output += ` ${argsStr}`;
    }

    console.log(output);
  }

  // Pino-compatible log methods
  fatal(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(60, '', message, ...args);
    } else {
      this.formatMessage(60, message, ...args);
    }
  }

  error(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(50, '', message, ...args);
    } else {
      this.formatMessage(50, message, ...args);
    }
  }

  warn(message: string | object, ...args: unknown[]): void {  
    if (typeof message === 'object') {
      this.formatMessage(40, '', message, ...args);
    } else {
      this.formatMessage(40, message, ...args);
    }
  }

  info(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(30, '', message, ...args);
    } else {
      this.formatMessage(30, message, ...args);
    }
  }

  log(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(29, '', message, ...args);
    } else {
      this.formatMessage(29, message, ...args);
    }
  }

  progress(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(28, '', message, ...args);
    } else {
      this.formatMessage(28, message, ...args);
    }
  }

  success(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(27, '', message, ...args);
    } else {
      this.formatMessage(27, message, ...args);
    }
  }

  debug(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(20, '', message, ...args);
    } else {
      this.formatMessage(20, message, ...args);
    }
  }

  trace(message: string | object, ...args: unknown[]): void {
    if (typeof message === 'object') {
      this.formatMessage(10, '', message, ...args);
    } else {
      this.formatMessage(10, message, ...args);
    }
  }

  // Pino-compatible child method
  child(bindings: Record<string, unknown>): ElizaLogger {
    return new ElizaLogger({ ...this.bindings, ...bindings }, this.logLevel);
  }

  // Clear method for API compatibility
  clear(): void {
    memoryDestination.clear();
  }
}

// Create logger factory function to match pino API
const createLogger = (bindings: any | boolean = false) => {
  if (bindings === false) {
    return new ElizaLogger();
  }
  
  const logLevel = bindings && typeof bindings === 'object' && bindings.logLevel 
    ? bindings.logLevel 
    : process.env.LOG_LEVEL || 'info';
    
  return new ElizaLogger(bindings || {}, logLevel);
};

// Create basic logger instance
const logger = new ElizaLogger();

// Attach memory destination for API access (matching pino symbol pattern)
(logger as any)[Symbol.for('pino-destination')] = memoryDestination;

export { createLogger, logger };

// for backward compatibility
export const elizaLogger = logger;

export default logger;