// Main entry point for the Claude CLI
export * from './auth/index.js';
export * from './cli/index.js';
export * from './session/index.js';
export * from './utils/markdown.js';
export * from './types/index.js';

// Import main components
import { AnthropicClient } from './auth/index.js';
import { parseArguments, executeCommand } from './cli/index.js';
import { initializeSession, getSessionId } from './session/index.js';
import { MarkdownRenderer } from './utils/markdown.js';

// Re-export main classes and functions
export {
  AnthropicClient,
  parseArguments,
  executeCommand,
  initializeSession,
  getSessionId,
  MarkdownRenderer
};

// Default export
export default {
  AnthropicClient,
  parseArguments,
  executeCommand,
  initializeSession,
  getSessionId,
  MarkdownRenderer
}; 