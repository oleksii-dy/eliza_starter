import type { DestinationStream, LoggerOptions } from 'pino';

/**
 * Configuration for a logger transport (destination stream)
 */
export interface LoggerTransportConfig {
  /** Name of the transport */
  name: string;
  /** Transport target (e.g., 'pino-pretty', 'pino-cloudwatch', etc.) */
  target: string;
  /** Transport-specific options */
  options?: Record<string, any>;
  /** Minimum log level for this transport */
  level?: string;
}

/**
 * Configuration for logger formatting
 */
export interface LoggerFormatterConfig {
  /** Use JSON format output */
  json?: boolean;
  /** Show timestamps in logs */
  timestamps?: boolean;
  /** Timestamp format (when timestamps are enabled) */
  timestampFormat?: string;
  /** Fields to ignore in output */
  ignore?: string[];
  /** Custom prettifiers for formatting */
  prettifiers?: Record<string, (value: any) => string>;
  /** Whether to colorize output */
  colorize?: boolean;
}

/**
 * Configuration for logger custom levels
 */
export interface LoggerLevelsConfig {
  /** Custom log levels and their numeric values */
  levels?: Record<string, number>;
  /** Colors for custom levels */
  colors?: Record<string, string>;
}

/**
 * Configuration for logger hooks
 */
export interface LoggerHooksConfig {
  /** Hook function to process log arguments before logging */
  logMethod?: (inputArgs: any[], method: any) => void;
  /** Hook function to process log data before writing */
  logData?: (data: any) => any;
}

/**
 * Main logger configuration interface
 */
export interface LoggerConfig {
  /** Logger name/label */
  name?: string;
  /** Default log level */
  level?: string;
  /** Whether to enable Sentry logging */
  sentry?: boolean;
  /** Custom log levels configuration */
  levels?: LoggerLevelsConfig;
  /** Formatter configuration */
  formatter?: LoggerFormatterConfig;
  /** Array of transport configurations */
  transports?: LoggerTransportConfig[];
  /** Logger hooks configuration */
  hooks?: LoggerHooksConfig;
  /** Raw pino options for advanced configuration */
  pinoOptions?: Partial<LoggerOptions>;
  /** Custom destination stream (for advanced use cases) */
  destination?: DestinationStream;
}

/**
 * Project-level logger configuration
 */
export interface ProjectLoggerConfig {
  /** Main logger configuration */
  logger?: LoggerConfig;
  /** Per-agent logger configurations */
  agents?: Record<string, LoggerConfig>;
}