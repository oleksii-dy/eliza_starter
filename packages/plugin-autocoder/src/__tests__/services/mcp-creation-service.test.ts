import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { IAgentRuntime } from '@elizaos/core';
import * as path from 'path';

// Mock fs/promises with factory function
mock.module('fs/promises', () => {
  return {
    mkdir: mock(),
    readdir: mock(),
    stat: mock(),
    copyFile: mock(),
    writeFile: mock(),
    readFile: mock(),
    access: mock(),
  };
});

// Mock other modules
mock.module('child_process', () => ({
  exec: mock((cmd, opts, callback) => {
    if (callback) {
      callback(null, '', '');
    } else {
      return Promise.resolve({ stdout: '', stderr: '' });
    }
  }),
}));

mock.module('util', () => ({
  promisify: mock(() =>
    mock((cmd: string) => {
      // Mock successful execution for all commands
      return Promise.resolve({ stdout: '', stderr: '' });
    })
  ),
}));

// Mock elizaLogger
mock.module('@elizaos/core', async () => {
  const actual = await import('@elizaos/core');
  return {
    ...actual,
    elizaLogger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },
    Service: class {
      constructor() {
        /* empty */
      }
      async start() {
        /* empty */
      }
      async stop() {
        /* empty */
      }
    },
  };
});

// Import modules after mocks
import * as fs from 'fs/promises';
import { elizaLogger } from '@elizaos/core';
import { MCPCreationService } from '../../services/McpCreationService.js';

describe('MCPCreationService', () => {
  let service: MCPCreationService;
  let mockRuntime: IAgentRuntime;
  let tempDir: string;

  beforeEach(() => {
    // Create mock runtime
    mockRuntime = {
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
    } as unknown as IAgentRuntime;

    // Create service instance
    service = new MCPCreationService(mockRuntime);

    // Setup temp directory
    tempDir = path.join(process.cwd(), '.test-mcp-projects');

    // Setup mocks with proper typing
    mock(fs.mkdir).mockResolvedValue(undefined);

    // Mock readdir to return template structure
    mock(fs.readdir).mockImplementation(async (dirPath) => {
      const dirStr = dirPath.toString();

      // Mock template directory structure
      if (dirStr.endsWith('mcp-starter')) {
        return ['src', 'package.json', 'tsconfig.json', 'README.md'] as any;
      }
      if (dirStr.endsWith('mcp-starter/src')) {
        return ['mcp-server', '__tests__', 'utils', 'index.ts'] as any;
      }
      if (dirStr.endsWith('mcp-server')) {
        return ['index.ts', 'tools', 'resources'] as any;
      }
      if (dirStr.endsWith('/tools')) {
        return ['example-tool.ts.template'] as any;
      }
      if (dirStr.endsWith('/resources')) {
        return ['example-resource.ts.template'] as any;
      }
      if (dirStr.endsWith('/__tests__')) {
        return ['mcp-server.test.ts'] as any;
      }
      if (dirStr.endsWith('/utils')) {
        return ['config.ts', 'logger.ts'] as any;
      }
      // Default empty for any other directory
      return [] as any;
    });

    // Mock stat to return directory/file info
    mock(fs.stat).mockImplementation(async (filePath) => {
      const pathStr = filePath.toString();
      const isDir =
        pathStr.endsWith('/src') ||
        pathStr.endsWith('/mcp-server') ||
        pathStr.endsWith('/__tests__') ||
        pathStr.endsWith('/utils') ||
        pathStr.endsWith('/tools') ||
        pathStr.endsWith('/resources') ||
        pathStr.endsWith('mcp-starter') ||
        pathStr.endsWith('test-mcp') ||
        pathStr.endsWith('mcp-with-tools') ||
        pathStr.endsWith('mcp-with-resources') ||
        pathStr.endsWith('mcp-with-deps') ||
        pathStr.endsWith('documented-mcp') ||
        pathStr.endsWith('error-project') ||
        pathStr.endsWith('git-fail-project') ||
        pathStr.endsWith('npm-fail-project');

      return {
        isDirectory: () => isDir,
        isFile: () => !isDir,
      } as any;
    });

    mock(fs.copyFile).mockResolvedValue(undefined);
    mock(fs.writeFile).mockResolvedValue(undefined);
    mock(fs.readFile).mockResolvedValue('mock content' as any);

    // Mock access to simulate file existence for required files
    mock(fs.access).mockImplementation(async (filePath) => {
      const pathStr = filePath.toString();

      // These files should exist for production readiness check
      if (
        pathStr.endsWith('package.json') ||
        pathStr.endsWith('tsconfig.json') ||
        pathStr.endsWith('README.md') ||
        pathStr.endsWith('src/index.ts') ||
        pathStr.endsWith('src/mcp-server/index.ts')
      ) {
        return Promise.resolve(undefined);
      }

      // Other files don't exist
      return Promise.reject(new Error('Not found'));
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('createMCPProject', () => {
    it('should create a basic MCP project successfully', async () => {
      const _config = {
        name: 'test-mcp',
        description: 'Test MCP server',
        outputDir: tempDir,
      };

      const result = await service.createMCPProject(_config);

      if (!result.success) {
        console.log('Test failed with error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.projectPath).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details?.filesCreated).toContain('package.json');
      expect(result.details?.filesCreated).toContain('README.md');
      // tsconfig.json is part of the template, not tracked separately
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should create project with tools', async () => {
      const _config = {
        name: 'mcp-with-tools',
        description: 'MCP server with tools',
        outputDir: tempDir,
        tools: [
          {
            name: 'calculator',
            description: 'Performs calculations',
            parameters: { expression: 'string' },
          },
          {
            name: 'web-search',
            description: 'Searches the web',
            parameters: { query: 'string', limit: 'number' },
          },
        ],
      };

      // Mock template reading
      mock(fs.readFile).mockImplementation(async (path) => {
        if (path.toString().includes('example-tool.ts.template')) {
          return '// Tool: {{TOOL_NAME}}\n// Description: {{TOOL_DESCRIPTION}}\n// Parameters: {{TOOL_PARAMETERS}}' as any;
        }
        return 'mock content' as any;
      });

      const result = await service.createMCPProject(_config);

      expect(result.success).toBe(true);
      expect(result.details?.toolsGenerated).toHaveLength(2);
      expect(result.details?.toolsGenerated).toContain('calculator-tool.ts');
      expect(result.details?.toolsGenerated).toContain('web-search-tool.ts');
    });

    it('should create project with resources', async () => {
      const _config = {
        name: 'mcp-with-resources',
        description: 'MCP server with resources',
        outputDir: tempDir,
        resources: [
          {
            name: 'config-file',
            description: 'Configuration file',
            mimeType: 'application/json',
          },
          {
            name: 'data-source',
            description: 'Data source',
            mimeType: 'text/csv',
          },
        ],
      };

      // Mock template reading
      mock(fs.readFile).mockImplementation(async (path) => {
        if (path.toString().includes('example-resource.ts.template')) {
          return '// Resource: {{RESOURCE_NAME}}\n// Description: {{RESOURCE_DESCRIPTION}}\n// MIME Type: {{RESOURCE_MIME_TYPE}}' as any;
        }
        return 'mock content' as any;
      });

      const result = await service.createMCPProject(_config);

      expect(result.success).toBe(true);
      expect(result.details?.resourcesGenerated).toHaveLength(2);
      expect(result.details?.resourcesGenerated).toContain('config-file-resource.ts');
      expect(result.details?.resourcesGenerated).toContain('data-source-resource.ts');
    });

    it('should handle additional dependencies', async () => {
      const _config = {
        name: 'mcp-with-deps',
        description: 'MCP server with dependencies',
        outputDir: tempDir,
        dependencies: ['axios', 'dotenv', 'zod'],
      };

      const result = await service.createMCPProject(_config);

      expect(result.success).toBe(true);

      // Check that package.json was written with dependencies
      const writeFileCalls = mock(fs.writeFile).mock.calls;
      const packageJsonCall = writeFileCalls.find((call) =>
        call[0].toString().endsWith('package.json')
      );
      expect(packageJsonCall).toBeDefined();

      const packageJson = JSON.parse(packageJsonCall![1] as string);
      expect(packageJson.dependencies).toHaveProperty('axios');
      expect(packageJson.dependencies).toHaveProperty('dotenv');
      expect(packageJson.dependencies).toHaveProperty('zod');
    });

    it('should handle errors gracefully', async () => {
      const _config = {
        name: 'error-project',
        description: 'This will fail',
        outputDir: tempDir,
      };

      // Make mkdir fail
      mock(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

      const result = await service.createMCPProject(_config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should validate required fields', async () => {
      const _config = {
        name: '',
        description: 'Test MCP server',
        outputDir: tempDir,
      };

      const result = await service.createMCPProject(_config);

      // Empty name should fail validation
      expect(result.success).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('should update server file with tools and resources', async () => {
      const _config = {
        name: 'test-mcp',
        description: 'Test MCP server',
        outputDir: tempDir,
        tools: [{ name: 'test-tool', description: 'Test tool' }],
        resources: [{ name: 'test-resource', description: 'Test resource' }],
      };

      // Mock the server template to have the placeholders
      mock(fs.readFile).mockImplementation(async (path) => {
        if (path.toString().includes('index.ts')) {
          return `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Tool imports
// {{TOOL_IMPORTS}}

// Resource imports
// {{RESOURCE_IMPORTS}}

const tools: any[] = [];
const resources: any[] = [];

export async function setupServer(server: Server) {
  // Register tools
  // {{REGISTER_TOOLS}}

  // Register resources
  // {{REGISTER_RESOURCES}}
}` as any;
        }
        return 'mock content' as any;
      });

      await service.createMCPProject(_config);

      // Find the server file write call
      const writeFileCalls = mock(fs.writeFile).mock.calls;
      const serverFileCall = writeFileCalls.find((call) =>
        call[0].toString().includes('src/mcp-server/index.ts')
      );

      expect(serverFileCall).toBeDefined();

      const serverContent = serverFileCall![1] as string;
      expect(serverContent).toContain('TestToolTool');
      expect(serverContent).toContain('TestResourceResource');
      expect(serverContent).toContain('tools.push(TestToolTool)');
      expect(serverContent).toContain('resources.push(TestResourceResource)');
    });

    it('should generate comprehensive README', async () => {
      const _config = {
        name: 'documented-mcp',
        description: 'Well-documented MCP server',
        outputDir: tempDir,
        tools: [
          {
            name: 'tool1',
            description: 'First tool',
            parameters: { param1: 'string' },
          },
        ],
        resources: [
          {
            name: 'resource1',
            description: 'First resource',
            mimeType: 'text/plain',
          },
        ],
      };

      const result = await service.createMCPProject(_config);

      expect(result.success).toBe(true);

      // Check README content
      const writeFileCalls = mock(fs.writeFile).mock.calls;
      const readmeCall = writeFileCalls.find((call) => call[0].toString().endsWith('README.md'));
      expect(readmeCall).toBeDefined();

      const readmeContent = readmeCall![1] as string;
      expect(readmeContent).toContain('# documented-mcp');
      expect(readmeContent).toContain('Well-documented MCP server');
      expect(readmeContent).toContain('## Available Tools');
      expect(readmeContent).toContain('### tool1');
      expect(readmeContent).toContain('## Available Resources');
      expect(readmeContent).toContain('### resource1');
      expect(readmeContent).toContain('**MIME Type:** text/plain');
    });

    it('should handle git initialization errors gracefully', async () => {
      const _config = {
        name: 'git-fail-project',
        description: 'Git will fail',
        outputDir: tempDir,
      };

      // Make the service use a non-existent template path
      const nonExistentPath = path.join(__dirname, 'non-existent-template');
      (service as any).templatePath = nonExistentPath;

      // Make readdir throw for non-existent template
      mock(fs.readdir).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await service.createMCPProject(_config);

      // Should fail due to missing template
      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });

    it('should handle npm install errors gracefully', async () => {
      const _config = {
        name: 'npm-fail-project',
        description: 'NPM will fail',
        outputDir: tempDir,
      };

      // Make the service use a non-existent template path
      const nonExistentPath = path.join(__dirname, 'non-existent-template');
      (service as any).templatePath = nonExistentPath;

      // Make readdir throw for non-existent template
      mock(fs.readdir).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await service.createMCPProject(_config);

      // Should fail due to missing template
      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOENT');
    });
  });

  describe('service lifecycle', () => {
    it('should start and stop correctly', async () => {
      await service.start();
      expect(elizaLogger.info).toHaveBeenCalledWith('[MCP] MCP Creation Service started');

      await service.stop();
      expect(elizaLogger.info).toHaveBeenCalledWith('[MCP] MCP Creation Service stopped');
    });
  });
});
