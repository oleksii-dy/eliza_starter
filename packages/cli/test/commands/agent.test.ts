import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { agent } from '../../src/commands/agent';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  log: vi.fn(),
  table: vi.fn(),
};

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('../../src/utils', () => ({
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
        },
      }),
    }),
  },
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
}));

describe('agent command', () => {
  let tempDir: string;
  let cwdSpy: Mock;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Reset all mocks
    mockLogger.info.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
    mockLogger.success.mockReset();
    mockLogger.log.mockReset();
    mockLogger.table.mockReset();
    mockFetch.mockReset();
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('agent list', () => {
    it('should list all agents when API returns agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: 'running',
          character: { name: 'Character 1' },
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          status: 'stopped',
          character: { name: 'Character 2' },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: mockAgents }),
      });

      // Get the list subcommand
      const listCommand = agent.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;

      await action({ port: 3000 });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/agents');
      expect(mockLogger.info).toHaveBeenCalledWith('Active agents:');
      expect(mockLogger.table).toHaveBeenCalledWith([
        {
          'Agent ID': 'agent-1',
          'Character Name': 'Character 1',
          Status: 'running',
        },
        {
          'Agent ID': 'agent-2',
          'Character Name': 'Character 2',
          Status: 'stopped',
        },
      ]);
    });

    it('should show message when no agents are found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      const listCommand = agent.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;

      await action({ port: 3000 });

      expect(mockLogger.info).toHaveBeenCalledWith('No agents are currently running');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const listCommand = agent.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;

      await action({ port: 3000 });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to the ElizaOS server at http://localhost:3000'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Make sure the server is running with: elizaos start'
      );
    });

    it('should support custom ports', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      const listCommand = agent.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;

      await action({ port: 8080 });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/agents');
    });

    it('should support remote URL option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] }),
      });

      const listCommand = agent.commands.find(cmd => cmd.name() === 'list');
      const action = (listCommand as any)._actionHandler;

      await action({ remoteUrl: 'https://api.example.com' });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/agents');
    });
  });

  describe('agent start', () => {
    it('should start an agent with character file', async () => {
      const characterPath = join(tempDir, 'character.json');
      const characterData = {
        name: 'Test Character',
        description: 'A test character',
      };
      await writeFile(characterPath, JSON.stringify(characterData));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          agentId: 'new-agent-id',
        }),
      });

      const startCommand = agent.commands.find(cmd => cmd.name() === 'start');
      const action = (startCommand as any)._actionHandler;

      await action(characterPath, { port: 3000 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/agents/start',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            character: characterData,
            characterPath,
          }),
        })
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        'Agent started successfully with ID: new-agent-id'
      );
    });

    it('should handle missing character file', async () => {
      const startCommand = agent.commands.find(cmd => cmd.name() === 'start');
      const action = (startCommand as any)._actionHandler;

      await expect(action('nonexistent.json', { port: 3000 })).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Character file not found: nonexistent.json'
      );
    });

    it('should handle invalid JSON in character file', async () => {
      const characterPath = join(tempDir, 'invalid.json');
      await writeFile(characterPath, 'invalid json content');

      const startCommand = agent.commands.find(cmd => cmd.name() === 'start');
      const action = (startCommand as any)._actionHandler;

      await expect(action(characterPath, { port: 3000 })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid character file')
      );
    });

    it('should handle API errors when starting agent', async () => {
      const characterPath = join(tempDir, 'character.json');
      await writeFile(characterPath, JSON.stringify({ name: 'Test' }));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid character data' }),
      });

      const startCommand = agent.commands.find(cmd => cmd.name() === 'start');
      const action = (startCommand as any)._actionHandler;

      await expect(action(characterPath, { port: 3000 })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start agent: Invalid character data'
      );
    });
  });

  describe('agent stop', () => {
    it('should stop an agent by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const stopCommand = agent.commands.find(cmd => cmd.name() === 'stop');
      const action = (stopCommand as any)._actionHandler;

      await action('agent-123', { port: 3000 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/agents/agent-123/stop',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        'Agent agent-123 stopped successfully'
      );
    });

    it('should handle stopping non-existent agent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Agent not found' }),
      });

      const stopCommand = agent.commands.find(cmd => cmd.name() === 'stop');
      const action = (stopCommand as any)._actionHandler;

      await expect(action('nonexistent', { port: 3000 })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to stop agent: Agent not found'
      );
    });

    it('should handle network errors when stopping', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const stopCommand = agent.commands.find(cmd => cmd.name() === 'stop');
      const action = (stopCommand as any)._actionHandler;

      await expect(action('agent-123', { port: 3000 })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to the ElizaOS server at http://localhost:3000'
      );
    });
  });

  describe('agent logs', () => {
    it('should display agent logs', async () => {
      const mockLogs = [
        { timestamp: '2024-01-01T00:00:00Z', level: 'info', message: 'Agent started' },
        { timestamp: '2024-01-01T00:01:00Z', level: 'debug', message: 'Processing message' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ logs: mockLogs }),
      });

      const logsCommand = agent.commands.find(cmd => cmd.name() === 'logs');
      const action = (logsCommand as any)._actionHandler;

      await action('agent-123', { port: 3000, tail: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/agents/agent-123/logs?limit=10'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Logs for agent agent-123:');
      // Verify logs are displayed
      mockLogs.forEach(log => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining(log.message)
        );
      });
    });

    it('should follow logs when --follow option is used', async () => {
      // Mock initial logs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logs: [{ timestamp: '2024-01-01T00:00:00Z', level: 'info', message: 'Initial log' }],
        }),
      });

      // Mock subsequent polling - return empty logs to avoid infinite loop
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ logs: [] }),
      });

      const logsCommand = agent.commands.find(cmd => cmd.name() === 'logs');
      const action = (logsCommand as any)._actionHandler;

      // Set up a timeout to prevent infinite loop in test
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100));
      
      // Run logs command with follow option
      const logsPromise = action('agent-123', { port: 3000, follow: true, tail: 10 });
      
      // Wait for timeout then check calls
      await timeoutPromise;

      // Should have made at least 2 calls (initial + one poll)
      expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/logs?limit=10')
      );
    });

    it('should handle agent not found when fetching logs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Agent not found' }),
      });

      const logsCommand = agent.commands.find(cmd => cmd.name() === 'logs');
      const action = (logsCommand as any)._actionHandler;

      await expect(action('nonexistent', { port: 3000, tail: 10 })).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch logs: Agent not found'
      );
    });
  });

  describe('helper functions', () => {
    it('should generate correct runtime URL', async () => {
      const { getAgentRuntimeUrl } = await import('../../src/commands/agent');
      
      expect(getAgentRuntimeUrl({ port: 3000 })).toBe('http://localhost:3000');
      expect(getAgentRuntimeUrl({ remoteUrl: 'https://api.example.com' }))
        .toBe('https://api.example.com');
      expect(getAgentRuntimeUrl({})).toBe('http://localhost:3000');
    });

    it('should generate correct agents base URL', async () => {
      const { getAgentsBaseUrl } = await import('../../src/commands/agent');
      
      expect(getAgentsBaseUrl({ port: 3000 })).toBe('http://localhost:3000/api/agents');
      expect(getAgentsBaseUrl({ remoteUrl: 'https://api.example.com' }))
        .toBe('https://api.example.com/api/agents');
    });
  });
});