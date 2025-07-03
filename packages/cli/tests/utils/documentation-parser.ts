import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@elizaos/core';

export interface DocumentedCommand {
  command: string;
  description: string;
  usage: string;
  examples: string[];
  options: DocumentedOption[];
  sourceFile: string;
  lineNumber: number;
}

export interface DocumentedOption {
  flag: string;
  description: string;
  type: 'boolean' | 'string' | 'number';
  required: boolean;
  default?: any;
}

export interface DocumentationSource {
  path: string;
  type: 'markdown' | 'typescript' | 'json';
}

export class DocumentationParser {
  private sources: DocumentationSource[] = [];
  private commands: DocumentedCommand[] = [];

  constructor() {
    this.discoverDocumentationSources();
  }

  private discoverDocumentationSources(): void {
    const projectRoot = process.cwd();
    
    // Common documentation locations
    const potentialSources = [
      { path: join(projectRoot, 'README.md'), type: 'markdown' as const },
      { path: join(projectRoot, 'CLI-COMMANDS.md'), type: 'markdown' as const },
      { path: join(projectRoot, 'docs', 'cli.md'), type: 'markdown' as const },
      { path: join(projectRoot, 'docs', 'commands.md'), type: 'markdown' as const },
      { path: join(projectRoot, 'src', 'index.ts'), type: 'typescript' as const },
      { path: join(projectRoot, 'package.json'), type: 'json' as const },
    ];

    for (const source of potentialSources) {
      if (existsSync(source.path)) {
        this.sources.push(source);
      }
    }

    logger.debug(`Found ${this.sources.length} documentation sources`);
  }

  async parseDocumentation(): Promise<DocumentedCommand[]> {
    this.commands = [];

    for (const source of this.sources) {
      try {
        switch (source.type) {
          case 'markdown':
            await this.parseMarkdownFile(source.path);
            break;
          case 'typescript':
            await this.parseTypeScriptFile(source.path);
            break;
          case 'json':
            await this.parseJsonFile(source.path);
            break;
        }
      } catch (error) {
        logger.error(`Error parsing documentation source ${source.path}:`, error);
      }
    }

    return this.commands;
  }

  private async parseMarkdownFile(filePath: string): Promise<void> {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let currentCommand: Partial<DocumentedCommand> | null = null;
    let inCodeBlock = false;
    let codeBlockType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockType = line.slice(3).trim();
        } else {
          inCodeBlock = false;
          codeBlockType = '';
        }
        continue;
      }

      // Skip content inside non-bash code blocks
      if (inCodeBlock && codeBlockType !== 'bash' && codeBlockType !== 'shell') {
        continue;
      }

      // Look for command patterns
      if (inCodeBlock && (codeBlockType === 'bash' || codeBlockType === 'shell')) {
        const commandMatch = line.match(/^\s*elizaos\s+(.+)$/);
        if (commandMatch) {
          const command = commandMatch[1].trim();
          
          // Look for description in previous lines
          let description = '';
          for (let j = i - 1; j >= 0; j--) {
            const prevLine = lines[j].trim();
            if (prevLine.startsWith('#') || prevLine === '') {
              if (prevLine.startsWith('#')) {
                description = prevLine.replace(/^#+\s*/, '');
              }
              break;
            }
          }

          this.commands.push({
            command,
            description,
            usage: `elizaos ${command}`,
            examples: [line.trim()],
            options: [],
            sourceFile: filePath,
            lineNumber: i + 1,
          });
        }
      }

      // Look for heading-based command documentation
      const headingMatch = line.match(/^#+\s*`?elizaos\s+(.+?)`?$/);
      if (headingMatch) {
        if (currentCommand) {
          this.commands.push(currentCommand as DocumentedCommand);
        }
        
        currentCommand = {
          command: headingMatch[1].trim(),
          description: '',
          usage: `elizaos ${headingMatch[1].trim()}`,
          examples: [],
          options: [],
          sourceFile: filePath,
          lineNumber: i + 1,
        };
      }

      // Look for option documentation
      if (currentCommand && line.match(/^\s*-\s*`?--?\w+`?/)) {
        const optionMatch = line.match(/^\s*-\s*`?(-{1,2}\w+)`?\s*:?\s*(.+)$/);
        if (optionMatch) {
          currentCommand.options = currentCommand.options || [];
          currentCommand.options.push({
            flag: optionMatch[1],
            description: optionMatch[2],
            type: 'string',
            required: false,
          });
        }
      }
    }

    if (currentCommand) {
      this.commands.push(currentCommand as DocumentedCommand);
    }
  }

  private async parseTypeScriptFile(filePath: string): Promise<void> {
    if (!existsSync(filePath)) {
      return;
    }

    // Skip if it's a directory
    const stat = require('fs').statSync(filePath);
    if (stat.isDirectory()) {
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    
    // Look for commander.js command definitions
    const commandMatches = content.matchAll(/\.command\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of commandMatches) {
      const command = match[1];
      
      // Try to find description
      const descriptionMatch = content.match(
        new RegExp(`\\.command\\s*\\(\\s*['"\`]${command}['"\`]\\s*\\)[\\s\\S]*?\\.description\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*\\)`)
      );
      
      this.commands.push({
        command,
        description: descriptionMatch ? descriptionMatch[1] : '',
        usage: `elizaos ${command}`,
        examples: [],
        options: [],
        sourceFile: filePath,
        lineNumber: 1,
      });
    }
  }

  private async parseJsonFile(filePath: string): Promise<void> {
    if (!filePath.endsWith('package.json')) {
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    // Look for bin commands
    if (packageJson.bin) {
      const binCommands = typeof packageJson.bin === 'string' 
        ? { [packageJson.name]: packageJson.bin }
        : packageJson.bin;
        
      for (const [name, path] of Object.entries(binCommands)) {
        this.commands.push({
          command: '',
          description: `${name} executable`,
          usage: name,
          examples: [],
          options: [],
          sourceFile: filePath,
          lineNumber: 1,
        });
      }
    }
  }

  getCommands(): DocumentedCommand[] {
    return [...this.commands];
  }

  findCommand(commandName: string): DocumentedCommand | undefined {
    return this.commands.find(cmd => 
      cmd.command === commandName || 
      cmd.command.startsWith(commandName + ' ') ||
      cmd.usage.includes(commandName)
    );
  }

  validateCommand(commandName: string): {
    exists: boolean;
    documented: boolean;
    command?: DocumentedCommand;
  } {
    const command = this.findCommand(commandName);
    
    return {
      exists: !!command,
      documented: !!command?.description,
      command,
    };
  }

  generateTestSpecs(): Array<{
    command: string;
    description: string;
    expectedExitCode: number;
  }> {
    return this.commands.map(cmd => ({
      command: cmd.command,
      description: `Test command: ${cmd.command}`,
      expectedExitCode: 0,
    }));
  }
}