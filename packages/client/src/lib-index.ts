// Main library exports for @elizaos/client (Agent Editor)

// Main Agent Editor Component
export { AgentEditor, default as AgentEditorDefault } from './components/AgentEditor';
export type { AgentEditorConfig } from './components/AgentEditor';

// Legacy App export (for backward compatibility)
export { default as App } from './App';

// API client
export { apiClient } from './lib/api';

// Essential hooks
export { useIsMobile } from './hooks/use-mobile';

// Context providers (required for AgentEditor)
export { AuthProvider } from './context/AuthContext';
export { ConnectionProvider } from './context/ConnectionContext';

// Core components for advanced usage
export { default as AgentCard } from './components/AgentCard';
export { ChatInputArea } from './components/ChatInputArea';
export { ChatMessageListComponent } from './components/ChatMessageListComponent';
export { default as ConnectionStatus } from './components/ConnectionStatus';

// Types
export type * from './types';

// Utils
export * from './lib/utils';
