/**
 * Configuration for enhanced validation engine
 */
export interface ValidationConfig {
  validation: {
    allowNoTestsAsSuccess: boolean;
    minTestCount: number;
    maxFailureRate: number;
    requireStackTraces: boolean;
    strictParsing: boolean;
  };
  thresholds: {
    minScore: number;
    maxExecutionTime: number;
    confidenceThreshold: number;
  };
  frameworks: {
    preferredFormat: 'json' | 'text';
    allowFallback: boolean;
    customParsers: Record<string, string>;
  };
  parsing: {
    maxRetries: number;
    timeoutMs: number;
    preserveOutput: boolean;
  };
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  validation: {
    allowNoTestsAsSuccess: false,
    minTestCount: 1,
    maxFailureRate: 0.5,
    requireStackTraces: false,
    strictParsing: false,
  },
  thresholds: {
    minScore: 60,
    maxExecutionTime: 300000, // 5 minutes
    confidenceThreshold: 0.8,
  },
  frameworks: {
    preferredFormat: 'json',
    allowFallback: true,
    customParsers: {},
  },
  parsing: {
    maxRetries: 3,
    timeoutMs: 30000,
    preserveOutput: true,
  },
};
