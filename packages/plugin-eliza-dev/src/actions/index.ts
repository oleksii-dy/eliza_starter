export { captureFeatureAction } from './capture-feature.js';

// Export placeholder actions for future implementation
export const implementFeatureAction = {
  name: 'IMPLEMENT_FEATURE',
  description: 'Implement a feature using SPARC methodology with TDD',
  validate: async () => false, // Placeholder
  handler: async () => ({ text: 'Implementation coming soon...', action: 'REPLY' }),
  examples: []
};

export const reviewPRAction = {
  name: 'REVIEW_PR', 
  description: 'Review a pull request with multi-agent analysis',
  validate: async () => false, // Placeholder
  handler: async () => ({ text: 'PR review coming soon...', action: 'REPLY' }),
  examples: []
};

export const evalPromptAction = {
  name: 'EVAL_PROMPT',
  description: 'Evaluate and optimize prompts',
  validate: async () => false, // Placeholder
  handler: async () => ({ text: 'Prompt evaluation coming soon...', action: 'REPLY' }),
  examples: []
};

export const shipReportAction = {
  name: 'SHIP_REPORT',
  description: 'Generate release notes and changelog',
  validate: async () => false, // Placeholder
  handler: async () => ({ text: 'Ship report coming soon...', action: 'REPLY' }),
  examples: []
};