// Autonomous agent features for Claude CLI

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

export interface ClaudeMdConfig {
  project: string;  // ./CLAUDE.md
  user: string;     // ~/.claude/CLAUDE.md
  includes: string[]; // External includes
}

export interface ToolPermission {
  toolName: string;
  granted: boolean;
  scope: 'temporary' | 'session' | 'permanent';
  timestamp: Date;
}

export interface ToolState {
  id: string;
  name: string;
  state: 'tool-input' | 'tool-use' | 'responding' | 'thinking' | 'requesting' | 'completed' | 'errored';
  parentId?: string;
  input?: any;
  output?: any;
  error?: Error;
  startTime: Date;
  endTime?: Date;
}

export class AutonomousAgent extends EventEmitter {
  private claudeMdPaths: ClaudeMdConfig;
  private toolStates: Map<string, ToolState>;
  private permissions: Map<string, ToolPermission>;
  private memory: Map<string, any>;

  constructor() {
    super();
    this.claudeMdPaths = {
      project: './CLAUDE.md',
      user: path.join(os.homedir(), '.claude', 'CLAUDE.md'),
      includes: []
    };
    this.toolStates = new Map();
    this.permissions = new Map();
    this.memory = new Map();
  }

    // Initialize CLAUDE.md for a project
  async initializeProject(): Promise<string> {
    const { COMMAND_PROMPTS } = await import('../prompts');
    const analysis = await this.analyzeCodebase();
    
    // Use the exact prompt from original
    const promptCommand = COMMAND_PROMPTS.init;
    const promptData = await promptCommand.getPromptForCommand();
    
    // For now, generate based on our analysis
    const claudeMd = this.generateClaudeMd(analysis);
    
    fs.writeFileSync(this.claudeMdPaths.project, claudeMd);
    this.emit('claudemd:created', this.claudeMdPaths.project);
    
    return claudeMd;
  }

  // Analyze codebase structure
  private async analyzeCodebase(): Promise<any> {
    const analysis = {
      structure: {},
      buildCommands: [],
      testCommands: [],
      architecture: '',
      dependencies: []
    };

    // Check for package.json
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

      // Extract scripts
      if (pkg.scripts) {
        if (pkg.scripts.build) {analysis.buildCommands.push('npm run build');}
        if (pkg.scripts.test) {analysis.testCommands.push('npm test');}
        if (pkg.scripts.lint) {analysis.buildCommands.push('npm run lint');}
      }

      // Extract dependencies
      analysis.dependencies = Object.keys(pkg.dependencies || {});
    }

    // Check for other config files
    const configFiles = [
      { file: '.cursorrules', type: 'cursor' },
      { file: '.cursor/rules', type: 'cursor' },
      { file: '.github/copilot-instructions.md', type: 'copilot' },
      { file: 'README.md', type: 'readme' }
    ];

    for (const config of configFiles) {
      if (fs.existsSync(config.file)) {
        analysis[config.type] = fs.readFileSync(config.file, 'utf-8');
      }
    }

    return analysis;
  }

  // Generate CLAUDE.md content
  private generateClaudeMd(analysis: any): string {
    let content = `# CLAUDE.md

This file provides guidance to Autocoder (claude.ai/code) when working with code in this repository.

## Build Commands
`;

    if (analysis.buildCommands.length > 0) {
      analysis.buildCommands.forEach((cmd: string) => {
        content += `- \`${cmd}\`\n`;
      });
    } else {
      content += '- No build commands found\n';
    }

    content += `
## Test Commands
`;

    if (analysis.testCommands.length > 0) {
      analysis.testCommands.forEach((cmd: string) => {
        content += `- \`${cmd}\`\n`;
      });
    } else {
      content += '- No test commands found\n';
    }

    if (analysis.dependencies.length > 0) {
      content += `
## Key Dependencies
`;
      analysis.dependencies.slice(0, 10).forEach((dep: string) => {
        content += `- ${dep}\n`;
      });
    }

    // Include existing rules if found
    if (analysis.cursor || analysis.copilot) {
      content += `
## Development Guidelines
`;
      if (analysis.cursor) {
        content += `\n### From Cursor Rules\n${analysis.cursor}\n`;
      }
      if (analysis.copilot) {
        content += `\n### From Copilot Instructions\n${analysis.copilot}\n`;
      }
    }

    return content;
  }

  // Load CLAUDE.md instructions
  async loadInstructions(): Promise<string> {
    let instructions = '';

    // Load project CLAUDE.md
    if (fs.existsSync(this.claudeMdPaths.project)) {
      instructions += `${fs.readFileSync(this.claudeMdPaths.project, 'utf-8')}\n\n`;
    }

    // Load user CLAUDE.md
    if (fs.existsSync(this.claudeMdPaths.user)) {
      instructions += `${fs.readFileSync(this.claudeMdPaths.user, 'utf-8')}\n\n`;
    }

    return instructions;
  }

  // Add to CLAUDE.md memory
  async memorize(content: string, location: 'project' | 'user' = 'project'): Promise<void> {
    const targetPath = location === 'project' ? this.claudeMdPaths.project : this.claudeMdPaths.user;

    // Ensure directory exists for user location
    if (location === 'user') {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Append to file
    const timestamp = new Date().toISOString();
    const memorizedContent = `\n\n## Memorized on ${timestamp}\n${content}`;

    fs.appendFileSync(targetPath, memorizedContent);
    this.emit('claudemd:updated', { path: targetPath, content });
  }

  // Tool execution with state tracking
  async executeTool(toolName: string, input: any, requiresPermission = true): Promise<any> {
    const toolId = this.generateToolId();
    const toolState: ToolState = {
      id: toolId,
      name: toolName,
      state: 'requesting',
      input,
      startTime: new Date()
    };

    this.toolStates.set(toolId, toolState);
    this.emit('tool:state', toolState);

    // Check permissions
    if (requiresPermission && !this.hasPermission(toolName)) {
      toolState.state = 'requesting';
      this.emit('tool:permission-required', { toolId, toolName, input });

      // Wait for permission (in real implementation)
      // For now, simulate denial
      toolState.state = 'errored';
      toolState.error = new Error(`Permission denied for tool: ${toolName}`);
      toolState.endTime = new Date();
      this.emit('tool:state', toolState);

      throw toolState.error;
    }

    // Execute tool
    try {
      toolState.state = 'tool-use';
      this.emit('tool:state', toolState);

      // Simulate tool execution
      const result = await this.simulateToolExecution(toolName, input);

      toolState.state = 'completed';
      toolState.output = result;
      toolState.endTime = new Date();
      this.emit('tool:state', toolState);

      return result;
    } catch (error) {
      toolState.state = 'errored';
      toolState.error = error as Error;
      toolState.endTime = new Date();
      this.emit('tool:state', toolState);

      throw error;
    }
  }

  // Check if tool has permission
  private hasPermission(toolName: string): boolean {
    const permission = this.permissions.get(toolName);
    return permission?.granted || false;
  }

  // Grant permission for a tool
  grantPermission(toolName: string, scope: 'temporary' | 'session' | 'permanent' = 'temporary'): void {
    this.permissions.set(toolName, {
      toolName,
      granted: true,
      scope,
      timestamp: new Date()
    });
    this.emit('tool:permission-granted', { toolName, scope });
  }

  // Simulate tool execution
  private async simulateToolExecution(toolName: string, input: any): Promise<any> {
    // Add delay to simulate execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (toolName) {
      case 'read_file':
        return `Contents of ${input.path}: [simulated content]`;
      case 'write_file':
        return `Written to ${input.path}`;
      case 'run_command':
        return `Command output for: ${input.command}`;
      default:
        return `Tool ${toolName} executed with input: ${JSON.stringify(input)}`;
    }
  }

  // Generate unique tool ID
  private generateToolId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get tool states
  getToolStates(): ToolState[] {
    return Array.from(this.toolStates.values());
  }

  // Get active tools
  getActiveTools(): ToolState[] {
    return this.getToolStates().filter(tool =>
      !['completed', 'errored'].includes(tool.state)
    );
  }
}

// Singleton instance
let agent: AutonomousAgent | null = null;

export function getAutonomousAgent(): AutonomousAgent {
  if (!agent) {
    agent = new AutonomousAgent();
  }
  return agent;
}
