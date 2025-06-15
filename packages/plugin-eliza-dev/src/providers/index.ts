export { githubContextProvider } from './github-context.js';
export { sparcPhaseProvider } from './sparc-phase.js';

// Export placeholder providers for future implementation
export const implementationStatusProvider = {
  name: 'IMPLEMENTATION_STATUS',
  description: 'Provides current implementation status and progress',
  get: async () => null // Placeholder
};

export const qualityMetricsProvider = {
  name: 'QUALITY_METRICS',
  description: 'Provides code quality metrics and analysis',
  get: async () => null // Placeholder
};