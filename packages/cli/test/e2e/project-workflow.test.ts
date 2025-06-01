import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execa } from 'execa';
import { existsSync } from 'node:fs';
import net from 'node:net';

// Helper to check if a port is available
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Helper to wait for server to be ready
async function waitForServer(port: number, timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not start on port ${port} within ${timeout}ms`);
}

describe('Project Workflow E2E', () => {
  let testDir: string;
  let elizaCmd: string;
  let originalEnv: typeof process.env;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'eliza-e2e-'));
    elizaCmd = join(process.cwd(), 'dist', 'index.js');
    originalEnv = { ...process.env };
    
    // Set non-interactive mode for all tests
    process.env.ELIZA_NONINTERACTIVE = '1';
  });

  afterEach(async () => {
    process.env = originalEnv;
    
    // Clean up any running processes
    try {
      await execa('pkill', ['-f', 'elizaos.*test']);
    } catch {
      // Ignore errors if no processes to kill
    }
    
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('create → start → stop workflow', () => {
    it('should create a new project and start the agent', async () => {
      const projectName = 'test-project';
      const projectPath = join(testDir, projectName);
      const port = 3456; // Use non-standard port to avoid conflicts

      // Step 1: Create project
      const createResult = await execa('node', [
        elizaCmd,
        'create',
        projectName,
        '--dir', testDir,
        '--yes',
        '--type', 'project',
        '--db', 'pglite',
      ], {
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      expect(createResult.exitCode).toBe(0);
      expect(existsSync(projectPath)).toBe(true);
      expect(existsSync(join(projectPath, 'package.json'))).toBe(true);
      
      // Verify package.json contents
      const packageJson = JSON.parse(
        await readFile(join(projectPath, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.dependencies).toHaveProperty('@elizaos/core');

      // Step 2: Start the project
      const startProcess = execa('node', [
        elizaCmd,
        'start',
        '--port', String(port),
        '--non-interactive',
      ], {
        cwd: projectPath,
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      // Wait for server to be ready
      await waitForServer(port);

      // Step 3: Verify agent is running
      const agentsResponse = await fetch(`http://localhost:${port}/api/agents`);
      expect(agentsResponse.ok).toBe(true);
      
      const agentsData = await agentsResponse.json();
      expect(agentsData.agents).toBeInstanceOf(Array);
      expect(agentsData.agents.length).toBeGreaterThan(0);

      // Step 4: Stop the server
      startProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify server is stopped
      const portAvailable = await isPortAvailable(port);
      expect(portAvailable).toBe(true);
    }, 30000); // Extended timeout for full workflow

    it('should create and test a plugin', async () => {
      const pluginName = 'test-plugin';
      const pluginPath = join(testDir, `plugin-${pluginName}`);
      const port = 3457;

      // Step 1: Create plugin
      const createResult = await execa('node', [
        elizaCmd,
        'create',
        pluginName,
        '--dir', testDir,
        '--yes',
        '--type', 'plugin',
      ], {
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      expect(createResult.exitCode).toBe(0);
      expect(existsSync(pluginPath)).toBe(true);
      
      // Verify plugin structure
      const packageJson = JSON.parse(
        await readFile(join(pluginPath, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe(`@elizaos/plugin-${pluginName}`);
      expect(existsSync(join(pluginPath, 'src', 'index.ts'))).toBe(true);

      // Step 2: Run plugin tests
      const testResult = await execa('node', [
        elizaCmd,
        'test',
        'e2e',
        '--port', String(port),
        '--skip-build', // Skip build for faster test
      ], {
        cwd: pluginPath,
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      expect(testResult.exitCode).toBe(0);
      expect(testResult.stdout).toContain('tests passed');
    }, 30000);
  });

  describe('multi-agent configuration', () => {
    it('should start multiple agents from configuration', async () => {
      const projectPath = join(testDir, 'multi-agent-project');
      const port = 3458;

      // Create project directory
      await execa('mkdir', ['-p', projectPath]);

      // Create package.json
      const packageJson = {
        name: 'multi-agent-project',
        version: '1.0.0',
        type: 'module',
        main: 'index.js',
        dependencies: {
          '@elizaos/core': '^1.0.0',
        },
      };
      await writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create index.js with multiple agents
      const indexContent = `
export const agents = [
  {
    character: {
      name: 'Agent Alpha',
      description: 'First test agent',
      modelProvider: 'openai',
    },
  },
  {
    character: {
      name: 'Agent Beta', 
      description: 'Second test agent',
      modelProvider: 'openai',
    },
  },
];
`;
      await writeFile(join(projectPath, 'index.js'), indexContent);

      // Create .env file
      await writeFile(
        join(projectPath, '.env'),
        'OPENAI_API_KEY=test-key\n'
      );

      // Start the multi-agent project
      const startProcess = execa('node', [
        elizaCmd,
        'start',
        '--port', String(port),
        '--non-interactive',
      ], {
        cwd: projectPath,
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      // Wait for server to be ready
      await waitForServer(port);

      // Verify both agents are running
      const agentsResponse = await fetch(`http://localhost:${port}/api/agents`);
      const agentsData = await agentsResponse.json();
      
      expect(agentsData.agents).toHaveLength(2);
      
      const agentNames = agentsData.agents.map((a: any) => a.character.name);
      expect(agentNames).toContain('Agent Alpha');
      expect(agentNames).toContain('Agent Beta');

      // Clean up
      startProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);
  });

  describe('environment configuration', () => {
    it('should prompt and store environment variables', async () => {
      const envPath = join(testDir, '.env');

      // Run env command to set OpenAI key
      const envResult = await execa('node', [
        elizaCmd,
        'env',
        'OPENAI_API_KEY=test-openai-key',
        '--env-file', envPath,
      ], {
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      expect(envResult.exitCode).toBe(0);
      expect(existsSync(envPath)).toBe(true);

      // Verify env file contents
      const envContent = await readFile(envPath, 'utf-8');
      expect(envContent).toContain('OPENAI_API_KEY=test-openai-key');

      // Add another env var
      const envResult2 = await execa('node', [
        elizaCmd,
        'env',
        'ANTHROPIC_API_KEY=test-anthropic-key',
        '--env-file', envPath,
      ], {
        env: {
          ...process.env,
          ELIZA_NONINTERACTIVE: '1',
        },
      });

      expect(envResult2.exitCode).toBe(0);
      
      // Verify both vars are present
      const updatedEnvContent = await readFile(envPath, 'utf-8');
      expect(updatedEnvContent).toContain('OPENAI_API_KEY=test-openai-key');
      expect(updatedEnvContent).toContain('ANTHROPIC_API_KEY=test-anthropic-key');
    });
  });

  describe('error scenarios', () => {
    it('should handle port conflicts gracefully', async () => {
      const projectPath = join(testDir, 'port-conflict-test');
      const port = 3459;

      // Create minimal project
      await execa('mkdir', ['-p', projectPath]);
      await writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify({
          name: 'port-conflict-test',
          version: '1.0.0',
          type: 'module',
          main: 'index.js',
        })
      );
      await writeFile(
        join(projectPath, 'index.js'),
        'export const agents = [];'
      );

      // Start first instance
      const firstProcess = execa('node', [
        elizaCmd,
        'start',
        '--port', String(port),
        '--non-interactive',
      ], {
        cwd: projectPath,
        env: { ...process.env, ELIZA_NONINTERACTIVE: '1' },
      });

      await waitForServer(port);

      // Try to start second instance on same port
      const secondResult = await execa('node', [
        elizaCmd,
        'start',
        '--port', String(port),
        '--non-interactive',
      ], {
        cwd: projectPath,
        env: { ...process.env, ELIZA_NONINTERACTIVE: '1' },
        reject: false,
      });

      expect(secondResult.exitCode).not.toBe(0);
      expect(secondResult.stderr).toContain(`Port ${port} is already in use`);

      // Clean up
      firstProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should handle missing character file gracefully', async () => {
      const result = await execa('node', [
        elizaCmd,
        'agent',
        'start',
        'nonexistent-character.json',
      ], {
        env: { ...process.env, ELIZA_NONINTERACTIVE: '1' },
        reject: false,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Character file not found');
    });
  });
});