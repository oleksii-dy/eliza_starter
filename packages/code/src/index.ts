// Main entry point for Claude CLI library

export * from './types';
export * from './auth';
export * from './cli';
export * from './session';
export * from './utils/markdown';
export * from './autonomous';
export * from './tools';
export * from './prompts';

// Re-export main components
export { AnthropicClient, OAuthManager, validateApiKey } from './auth/index';
export { createProgram, handleChatCommand, handleCompleteCommand, handleAuthCommand, handleInitCommand, handleMemorizeCommand } from './cli/index';
export { SessionManager, initializeSession, getSession, getSessionId } from './session/index';
export { MarkdownRenderer } from './utils/markdown';
export { AutonomousAgent, getAutonomousAgent } from './autonomous/index';
export { ToolSystem, getToolSystem, BUILT_IN_TOOLS } from './tools/index';
export { SYSTEM_PROMPTS, COMMAND_PROMPTS, PERMISSION_PROMPTS, PLAN_PROMPTS } from './prompts/index'; 