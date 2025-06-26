// Tool system based on original Claude CLI patterns

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Tool use tracking from original
export interface ToolUse {
  tool_use_id: string;
  type: 'tool_use';
  name: string;
  input: any;
  is_error?: boolean;
}

export interface ToolUseState {
  toolUseID: string;
  parentToolUseID?: string;
  state: 'tool-input' | 'tool-use' | 'responding' | 'thinking' | 'requesting' | 'completed' | 'errored';
  name: string;
  input?: any;
  output?: any;
  error?: Error;
}

export interface ToolPermissionContext {
  tool: string;
  description: string;
  input: any;
  scope?: 'temporary' | 'session' | 'permanent';
}

// Tool renderer interface from original
export interface ToolRenderer {
  renderToolUseMessage(data: any, context?: any): string;
  renderToolUseProgressMessage(data: any, context?: any): string;
  renderToolUseRejectedMessage(context?: any): string;
  renderToolUseErrorMessage(error: Error, context?: any): string;
  renderToolUseQueuedMessage?(): string;
}

export class ToolSystem extends EventEmitter implements ToolRenderer {
  private erroredToolUseIDs: Set<string> = new Set();
  private inProgressToolUseIDs: Set<string> = new Set();
  private resolvedToolUseIDs: Set<string> = new Set();
  private toolStates: Map<string, ToolUseState> = new Map();
  private permissions: Map<string, boolean> = new Map();

  constructor() {
    super();
  }

  // Generate tool use ID following original pattern
  generateToolUseId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `toolu_${timestamp}_${random}`;
  }

  // Track tool states
  setToolState(toolUseID: string, state: ToolUseState): void {
    this.toolStates.set(toolUseID, state);
    
    // Update ID sets based on state
    if (state.state === 'tool-use' || state.state === 'tool-input') {
      this.inProgressToolUseIDs.add(toolUseID);
      this.erroredToolUseIDs.delete(toolUseID);
      this.resolvedToolUseIDs.delete(toolUseID);
    } else if (state.state === 'completed') {
      this.inProgressToolUseIDs.delete(toolUseID);
      this.erroredToolUseIDs.delete(toolUseID);
      this.resolvedToolUseIDs.add(toolUseID);
    } else if (state.state === 'errored') {
      this.inProgressToolUseIDs.delete(toolUseID);
      this.erroredToolUseIDs.add(toolUseID);
      this.resolvedToolUseIDs.delete(toolUseID);
    }

    this.emit('tool:state:change', state);
  }

  // Check if we have permission for a tool
  async checkPermission(context: ToolPermissionContext): Promise<boolean> {
    const cacheKey = `${context.tool}:${context.scope || 'temporary'}`;
    
    if (this.permissions.has(cacheKey)) {
      return this.permissions.get(cacheKey)!;
    }

    // Emit permission request following original pattern
    this.emit('tool:permission:request', {
      message: `Autocoder requested permissions to use ${context.tool}, but you haven't granted it yet.`,
      tool: context.tool,
      description: context.description,
      input: context.input
    });

    // In real implementation, wait for user response
    // For now, return false (denied)
    return false;
  }

  // Grant permission
  grantPermission(tool: string, scope: 'temporary' | 'session' | 'permanent' = 'temporary'): void {
    const cacheKey = `${tool}:${scope}`;
    this.permissions.set(cacheKey, true);
    this.emit('tool:permission:granted', { tool, scope });
  }

  // Tool renderer methods
  renderToolUseMessage(data: any, context?: any): string {
    return `⚒ Tool: ${data.name || 'unknown'}\n${JSON.stringify(data.input, null, 2)}`;
  }

  renderToolUseProgressMessage(data: any, context?: any): string {
    return `⏳ In progress: ${data.name || 'unknown'}...`;
  }

  renderToolUseRejectedMessage(context?: any): string {
    return '❌ Tool use rejected by user';
  }

  renderToolUseErrorMessage(error: Error, context?: any): string {
    return `❌ Tool error: ${error.message}`;
  }

  renderToolUseQueuedMessage(): string {
    return '⏸ Tool queued for execution';
  }

  // Get tool states for rendering
  getToolStates() {
    return {
      erroredToolUseIDs: this.erroredToolUseIDs,
      inProgressToolUseIDs: this.inProgressToolUseIDs,
      resolvedToolUseIDs: this.resolvedToolUseIDs
    };
  }
}

// Built-in tools following original patterns
export const BUILT_IN_TOOLS = {
  read_file: {
    name: 'read_file',
    description: 'Read contents of a file',
    requiresPermission: true,
    async execute(input: { path: string }): Promise<string> {
      return fs.readFileSync(input.path, 'utf-8');
    }
  },
  
  write_file: {
    name: 'write_file', 
    description: 'Write contents to a file',
    requiresPermission: true,
    async execute(input: { path: string; content: string }): Promise<void> {
      fs.writeFileSync(input.path, input.content);
    }
  },

  run_command: {
    name: 'run_command',
    description: 'Execute a shell command',
    requiresPermission: true,
    async execute(input: { command: string; cwd?: string }): Promise<{ stdout: string; stderr: string }> {
      const { stdout, stderr } = await execAsync(input.command, { cwd: input.cwd });
      return { stdout, stderr };
    }
  },

  list_directory: {
    name: 'list_directory',
    description: 'List contents of a directory',
    requiresPermission: true,
    async execute(input: { path: string }): Promise<string[]> {
      return fs.readdirSync(input.path);
    }
  }
};

// Singleton tool system
let toolSystem: ToolSystem | null = null;

export function getToolSystem(): ToolSystem {
  if (!toolSystem) {
    toolSystem = new ToolSystem();
  }
  return toolSystem;
} 