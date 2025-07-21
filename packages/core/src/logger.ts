import pino, { type DestinationStream, type LogFn } from 'pino';
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
  [key: string]: unknown;
}

// Custom destination that maintains recent logs in memory
/**
 * Class representing an in-memory destination stream for logging.
 * Implements DestinationStream interface.
 */
class InMemoryDestination implements DestinationStream {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private stream: DestinationStream | null;

  /**
   * Constructor for creating a new instance of the class.
   * @param {DestinationStream|null} stream - The stream to assign to the instance. Can be null.
   */
  constructor(stream: DestinationStream | null) {
    this.stream = stream;
  }

  /**
   * Writes a log entry to the memory buffer and forwards it to the pretty print stream if available.
   *
   * @param {string | LogEntry} data - The data to be written, which can be either a string or a LogEntry object.
   * @returns {void}
   */
  write(data: string | LogEntry): void {
    // Parse the log entry if it's a string
    let logEntry: LogEntry;
    let stringData: string;

    if (typeof data === 'string') {
      stringData = data;
      try {
        logEntry = JSON.parse(data);
      } catch (e) {
        // If it's not valid JSON, just pass it through
        if (this.stream) {
          this.stream.write(data);
        }
        return;
      }
    } else {
      logEntry = data;
      stringData = JSON.stringify(data);
    }

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
            console.error('Filtered log:', stringData);
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

    // Forward to pretty print stream if available
    if (this.stream) {
      this.stream.write(stringData);
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

let raw = parseBooleanFromText(process?.env?.LOG_JSON_FORMAT) || false;

// Set default log level to info to allow regular logs, but still filter service logs
const logLevel = (process?.env?.LOG_LEVEL || '').toLowerCase();
const effectiveLogLevel = logLevel || process?.env?.DEFAULT_LOG_LEVEL || 'info';

// Check if user wants timestamps in logs (default: true)
const showTimestamps =
  process?.env?.LOG_TIMESTAMPS !== undefined
    ? parseBooleanFromText(process?.env?.LOG_TIMESTAMPS)
    : true;

// Create a function to generate the pretty configuration
const createPrettyConfig = () => ({
  colorize: true,
  translateTime: showTimestamps ? 'yyyy-mm-dd HH:MM:ss' : false,
  ignore: showTimestamps ? 'pid,hostname' : 'pid,hostname,time',
  levelColors: {
    60: 'red', // fatal
    50: 'red', // error
    40: 'yellow', // warn
    30: 'blue', // info
    29: 'green', // log
    28: 'cyan', // progress
    27: 'greenBright', // success
    20: 'magenta', // debug
    10: 'grey', // trace
    '*': 'white', // default for any unspecified level
  },
  customPrettifiers: {
    level: (inputData: any) => {
      let level: unknown;
      if (typeof inputData === 'object' && inputData !== null) {
        level = inputData.level || inputData.value;
      } else {
        level = inputData;
      }

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

      if (typeof level === 'number') {
        return levelNames[level] || `LEVEL${level}`;
      }

      if (level === undefined || level === null) {
        return 'UNKNOWN';
      }

      return String(level).toUpperCase();
    },
    // Add a custom prettifier for error messages
    msg: (msg: string) => {
      // Replace "ERROR (TypeError):" pattern with just "ERROR:"
      return msg.replace(/ERROR \([^)]+\):/g, 'ERROR:');
    },
  },
  messageFormat: '{msg}',
});

const createStream = async () => {
  if (raw) {
    return undefined;
  }
  // dynamically import pretty to avoid importing it in the browser
  const pretty = await import('pino-pretty') as any;
  return (pretty.default || pretty)(createPrettyConfig());
};

// Create options with appropriate level
const options = {
  level: effectiveLogLevel, // Use more restrictive level unless in debug mode
  customLevels,
  hooks: {
    logMethod(inputArgs: [string | Record<string, unknown>, ...unknown[]], method: LogFn): void {
      const [arg1, ...rest] = inputArgs;
      if (process.env.SENTRY_LOGGING !== 'false') {
        if (arg1 instanceof Error) {
          Sentry.captureException(arg1);
        } else {
          for (const item of rest) {
            if (item instanceof Error) {
              Sentry.captureException(item);
            }
          }
        }
      }

      const formatError = (err: Error) => ({
        message: `(${err.name}) ${err.message}`,
        stack: err.stack?.split('\n').map((line) => line.trim()),
      });

      if (typeof arg1 === 'object') {
        if (arg1 instanceof Error) {
          method.apply(this, [
            {
              error: formatError(arg1),
            },
          ]);
        } else {
          const messageParts = rest.map((arg) =>
            typeof arg === 'string' ? arg : JSON.stringify(arg)
          );
          const message = messageParts.join(' ');
          method.apply(this, [arg1, message]);
        }
      } else {
        const context = {};
        const messageParts = [arg1, ...rest].map((arg) => {
          if (arg instanceof Error) {
            return formatError(arg);
          }
          return typeof arg === 'string' ? arg : arg;
        });
        const message = messageParts.filter((part) => typeof part === 'string').join(' ');
        const jsonParts = messageParts.filter((part) => typeof part === 'object');

        Object.assign(context, ...jsonParts);

        method.apply(this, [context, message]);
      }
    },
  },
};

// allow runtime logger to inherent options set here
const createLogger = (bindings: any | boolean = false) => {
  const opts: any = { ...options }; // shallow copy
  if (bindings) {
    //opts.level = process.env.LOG_LEVEL || 'info'
    opts.base = bindings; // shallow change
  }
  
  // Configure transports based on environment
  const logFile = process.env.PINO_LOG_FILE;
  const logFileJson = process.env.PINO_LOG_FILE_JSON === 'true';
  const transportType = process.env.LOG_TRANSPORT || 'console';
  
  if (transportType === 'file' && logFile) {
    // Multi-transport configuration for file + console
    const targets = [
      {
        target: 'pino/file',
        options: { destination: logFile }
      }
    ];
    
    // Only add pretty console output if not in raw/JSON mode
    if (!raw) {
      targets.push({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: showTimestamps ? 'SYS:standard' : false,
          ignore: showTimestamps ? 'pid,hostname' : 'pid,hostname,time'
        }
      } as any);
    }
    
    opts.transport = { targets };
  } else if (!raw && transportType === 'console') {
    // Console only with pretty printing (only if not in JSON format)
    opts.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: showTimestamps ? 'SYS:standard' : false,
        ignore: showTimestamps ? 'pid,hostname' : 'pid,hostname,time',
      }
    };
  }
  // If raw is true, no transport is set, so we get raw JSON output
  
  const logger = pino(opts);
  return logger;
};

// Create basic logger initially
let logger = pino(options);
// Add type for logger with clear method
interface LoggerWithClear extends pino.Logger {
  clear: () => void;
}

// Enhance logger with custom destination in Node.js environment
if (typeof process !== 'undefined') {
  // Create the destination with in-memory logging
  // Instead of async initialization, initialize synchronously to avoid race conditions
  let stream = null;

  if (!raw) {
    // If we're in a Node.js environment where require is available, use require for pino-pretty
    // This will ensure synchronous loading
    try {
      if (typeof require !== 'undefined' && process.versions?.node) {
        const pretty = require('pino-pretty');
        stream = (pretty.default || pretty)(createPrettyConfig());
      }
    } catch (e) {
      // Fall back to async loading if synchronous loading fails
      createStream().then((prettyStream) => {
        const destination = new InMemoryDestination(prettyStream);
        logger = pino(options, destination);
        (logger as unknown)[Symbol.for('pino-destination')] = destination;

        // Add clear method to logger
        (logger as unknown as LoggerWithClear).clear = () => {
          const destination = (logger as unknown)[Symbol.for('pino-destination')];
          if (destination instanceof InMemoryDestination) {
            destination.clear();
          }
        };
      });
    }
  }

  // If stream was created synchronously, use it now
  if (stream !== null || raw) {
    const destination = new InMemoryDestination(stream);
    logger = pino(options, destination);
    (logger as unknown)[Symbol.for('pino-destination')] = destination;

    // Add clear method to logger
    (logger as unknown as LoggerWithClear).clear = () => {
      const destination = (logger as unknown)[Symbol.for('pino-destination')];
      if (destination instanceof InMemoryDestination) {
        destination.clear();
      }
    };
  }
}

// Function to load logger configuration from file
function loadLoggerConfigFromFile(): any {
  try {
    if (typeof process !== 'undefined' && typeof require !== 'undefined' && process.versions?.node) {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Try local project config first
      const localConfigPath = path.join(process.cwd(), '.eliza', 'logger.config.json');
      if (fs.existsSync(localConfigPath)) {
        const configData = fs.readFileSync(localConfigPath, 'utf-8');
        return JSON.parse(configData);
      }
      
      // Fall back to global config
      const globalConfigPath = path.join(os.homedir(), '.elizaos', 'logger.config.json');
      if (fs.existsSync(globalConfigPath)) {
        const configData = fs.readFileSync(globalConfigPath, 'utf-8');
        return JSON.parse(configData);
      }
    }
  } catch (error) {
    // Ignore config file errors, fall back to env vars
  }
  return null;
}

// Function to reconfigure the logger with new level and transport
function reconfigureLogger(): void {
  // Load config from file
  const fileConfig = loadLoggerConfigFromFile();
  
  // Priority order: ENV > Config file > Defaults
  const logLevel = (process?.env?.LOG_LEVEL || '').toLowerCase();
  const newEffectiveLogLevel = logLevel || fileConfig?.level || process?.env?.DEFAULT_LOG_LEVEL || 'info';
  
  // Check if JSON format has changed
  const newRaw = parseBooleanFromText(process?.env?.LOG_JSON_FORMAT) || false;
  const formatChanged = newRaw !== raw;
  
  // Update the logger level
  logger.level = newEffectiveLogLevel;
  
  // If format changed, we need to reinitialize the logger
  if (formatChanged) {
    raw = newRaw;
    
    // Reinitialize the logger with the new format
    const opts: any = { ...options };
    opts.level = newEffectiveLogLevel;
    
    // Configure transports based on environment and new format
    const transportType = process.env.LOG_TRANSPORT || fileConfig?.transport || 'console';
    const logFile = process.env.PINO_LOG_FILE || fileConfig?.file;
    
    if (transportType === 'file' && logFile) {
      // Multi-transport configuration for file + console
      const targets = [
        {
          target: 'pino/file',
          options: { destination: logFile }
        }
      ] as TransportTarget[];
      
      // Only add pretty console output if not in raw/JSON mode
      if (!raw) {
        targets.push({
          target: 'pino-pretty',
          options: createPrettyConfig()
        });
      }
      
      opts.transport = { targets };
    } else if (!raw && transportType === 'console') {
      // Console only with pretty printing (only if not in JSON format)
      opts.transport = {
        target: 'pino-pretty',
        options: createPrettyConfig()
      };
    }
    // If raw is true, no transport is set, so we get raw JSON output
    
    // Create new logger instance
    const newLogger = pino(opts);
    
    // If we have in-memory destination, set it up for the new logger
    if (typeof process !== 'undefined' && (logger as unknown)[Symbol.for('pino-destination')]) {
      let stream = null;
      
      if (!raw) {
        try {
          if (typeof require !== 'undefined' && process.versions?.node) {
            const pretty = require('pino-pretty');
            stream = (pretty.default || pretty)(createPrettyConfig());
          }
        } catch (e) {
          // Ignore error
        }
      }
      
      if (stream !== null || raw) {
        const destination = new InMemoryDestination(stream);
        logger = pino(opts, destination);
        (logger as unknown)[Symbol.for('pino-destination')] = destination;
        
        // Add clear method to logger
        (logger as unknown as LoggerWithClear).clear = () => {
          const dest = (logger as unknown)[Symbol.for('pino-destination')];
          if (dest instanceof InMemoryDestination) {
            dest.clear();
          }
        };
      } else {
        logger = newLogger as any;
      }
    } else {
      logger = newLogger as any;
    }
    
    // Logger instance is updated above
    
    logger.info(`Logger format changed to ${raw ? 'JSON' : 'pretty'} format`);
  } else {
    // If file transport is configured, we need to notify that a restart is required
    const transportType = process.env.LOG_TRANSPORT || fileConfig?.transport || 'console';
    const logFile = process.env.PINO_LOG_FILE || fileConfig?.file;
    
    if (transportType === 'file' && logFile && !logger.transport) {
      // Note: Pino transports can only be configured at creation time
      // Log a message to inform the user
      logger.warn('File transport configuration changed. Restart the application to apply file logging.');
    }
  }
}

// Export functions and logger
export { createLogger, reconfigureLogger, logger };

// for backward compatibility
export const elizaLogger = logger;

export default logger;
