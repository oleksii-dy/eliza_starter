// Type definitions for @elizaos/client

import type { ReactNode } from 'react';

// Main Agent Editor Component Config
export interface AgentEditorConfig {
  apiUrl?: string;
  apiKey?: string;
  embeddedMode?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  user?: {
    id: string;
    email: string;
    name: string;
  };
  organizationId?: string;
  requiredPlugins?: string[];
  platformUrl?: string;
  onAgentCreated?: (agent: { id: string; name: string; [key: string]: unknown }) => void;
  onAgentUpdated?: (agent: { id: string; name: string; [key: string]: unknown }) => void;
  onError?: (error: Error) => void;
}

// Main Agent Editor Component
export declare function AgentEditor(config?: AgentEditorConfig): ReactNode;
export declare const AgentEditorDefault: typeof AgentEditor;

// Legacy App export (for backward compatibility)
export declare function App(): ReactNode;
export declare const AppDefault: typeof App;

// API client
export declare const apiClient: {
  getAgents: () => Promise<any[]>;
  getAgent: (id: string) => Promise<any>;
  createAgent: (data: any) => Promise<any>;
  updateAgent: (id: string, data: any) => Promise<any>;
  deleteAgent: (id: string) => Promise<void>;
  [key: string]: any;
};

// Essential hooks
export declare function useIsMobile(): boolean;

// Context providers (required for AgentEditor)
export declare function AuthProvider({ children }: { children: ReactNode }): ReactNode;
export declare function ConnectionProvider({ children }: { children: ReactNode }): ReactNode;

// Core components for advanced usage
export declare function AgentCard(props: any): ReactNode;
export declare function ChatInputArea(props: any): ReactNode;
export declare function ChatMessageListComponent(props: any): ReactNode;
export declare function ConnectionStatus(props: any): ReactNode;

// Utils
export declare function cn(...classes: any[]): string;
export declare function formatAgentName(name: string): string;
export declare function getAgentAvatar(agent: any): string;
export declare function getEntityId(entity: any): string;
export declare function generateGroupName(): string;
export declare function randomUUID(): string;
export declare function compressImage(file: File, maxSize: number): Promise<File>;

// Re-export all types
export type * from './types';
