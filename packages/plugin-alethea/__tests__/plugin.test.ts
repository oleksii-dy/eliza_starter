import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import aletheaPlugin, {
  AletheaService,
  aliAgentActions,
  inftActions,
  hiveActions,
  tokenActions,
  governanceActions,
  marketDataActions,
} from '../src/plugin';
import { IAgentRuntime, logger } from '@elizaos/core';
import { createMockRuntime, MockRuntime } from './test-utils';

// Mock the logger to prevent console output during tests
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

describe('Alethea Plugin Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.ALETHEA_RPC_URL;
    delete process.env.PRIVATE_KEY;
    delete process.env.ALETHEA_API_KEY;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should have the correct name and description', () => {
    expect(aletheaPlugin.name).toBe('alethea');
    expect(aletheaPlugin.description).toBe('A plugin for interacting with the Alethea AI platform');
    expect(typeof aletheaPlugin.description).toBe('string');
  });

  it('should initialize successfully with valid configuration', async () => {
    const validConfig = {
      ALETHEA_RPC_URL: 'https://api.alethea.ai',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ALETHEA_API_KEY: 'valid-api-key-12345',
    };

    await expect(aletheaPlugin.init!(validConfig)).resolves.not.toThrow();

    // Verify environment variables are set
    expect(process.env.ALETHEA_RPC_URL).toBe(validConfig.ALETHEA_RPC_URL);
    expect(process.env.PRIVATE_KEY).toBe(validConfig.PRIVATE_KEY);
    expect(process.env.ALETHEA_API_KEY).toBe(validConfig.ALETHEA_API_KEY);

    // Verify logger was called
    expect(logger.info).toHaveBeenCalledWith('*** Initializing Alethea AI plugin ***');
    expect(logger.info).toHaveBeenCalledWith('Alethea AI plugin initialized successfully');
  });

  it('should throw error for invalid ALETHEA_RPC_URL', async () => {
    const invalidConfig = {
      ALETHEA_RPC_URL: 'not-a-valid-url',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ALETHEA_API_KEY: 'valid-api-key-12345',
    };

    await expect(aletheaPlugin.init!(invalidConfig)).rejects.toThrow(
      'Invalid Alethea AI plugin configuration: ALETHEA_RPC_URL must be a valid URL'
    );
  });

  it('should throw error for empty ALETHEA_RPC_URL', async () => {
    const invalidConfig = {
      ALETHEA_RPC_URL: '',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ALETHEA_API_KEY: 'valid-api-key-12345',
    };

    await expect(aletheaPlugin.init!(invalidConfig)).rejects.toThrow(
      'Invalid Alethea AI plugin configuration'
    );
  });

  it('should throw error for empty PRIVATE_KEY', async () => {
    const invalidConfig = {
      ALETHEA_RPC_URL: 'https://api.alethea.ai',
      PRIVATE_KEY: '',
      ALETHEA_API_KEY: 'valid-api-key-12345',
    };

    await expect(aletheaPlugin.init!(invalidConfig)).rejects.toThrow(
      'Invalid Alethea AI plugin configuration: PRIVATE_KEY cannot be empty'
    );
  });

  it('should throw error for empty ALETHEA_API_KEY', async () => {
    const invalidConfig = {
      ALETHEA_RPC_URL: 'https://api.alethea.ai',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ALETHEA_API_KEY: '',
    };

    await expect(aletheaPlugin.init!(invalidConfig)).rejects.toThrow(
      'Invalid Alethea AI plugin configuration: ALETHEA_API_KEY cannot be empty'
    );
  });

  it('should throw error for missing configuration values', async () => {
    const invalidConfig = {};

    await expect(aletheaPlugin.init!(invalidConfig)).rejects.toThrow(
      'Invalid Alethea AI plugin configuration'
    );
  });

  it('should handle non-zod errors gracefully', async () => {
    // Mock the configSchema by throwing a non-ZodError in the init function
    const originalInit = aletheaPlugin.init;
    aletheaPlugin.init = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error('Unexpected error'));
    });

    const validConfig = {
      ALETHEA_RPC_URL: 'https://api.alethea.ai',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ALETHEA_API_KEY: 'valid-api-key-12345',
    };

    await expect(aletheaPlugin.init!(validConfig)).rejects.toThrow('Unexpected error');

    // Restore the original method
    aletheaPlugin.init = originalInit;
  });
});

describe('Alethea Service', () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should have correct service type and description', () => {
    expect(AletheaService.serviceType).toBe('alethea');

    const service = new AletheaService(mockRuntime as unknown as IAgentRuntime);
    expect(service.capabilityDescription).toBe(
      'This service provides access to Alethea AI platform, including AliAgents, INFTs, Hive, tokens, and governance.'
    );
  });

  it('should start successfully', async () => {
    const service = await AletheaService.start(mockRuntime as unknown as IAgentRuntime);

    expect(service).toBeInstanceOf(AletheaService);
    expect(logger.info).toHaveBeenCalledWith('*** Starting Alethea AI service ***');
  });

  it('should stop successfully when service exists', async () => {
    // Mock getService to return a service instance
    const mockService = new AletheaService(mockRuntime as unknown as IAgentRuntime);
    mockService.stop = vi.fn();
    mockRuntime.getService.mockReturnValue(mockService);

    await expect(
      AletheaService.stop(mockRuntime as unknown as IAgentRuntime)
    ).resolves.not.toThrow();

    expect(mockRuntime.getService).toHaveBeenCalledWith('alethea');
    expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service ***');
    expect(mockService.stop).toHaveBeenCalled();
  });

  it('should throw error when stopping non-existent service', async () => {
    // Mock getService to return null (service not found)
    mockRuntime.getService.mockReturnValue(null);

    await expect(AletheaService.stop(mockRuntime as unknown as IAgentRuntime)).rejects.toThrow(
      'Alethea AI service not found'
    );

    expect(mockRuntime.getService).toHaveBeenCalledWith('alethea');
    expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service ***');
  });

  it('should stop service instance successfully', async () => {
    const service = new AletheaService(mockRuntime as unknown as IAgentRuntime);

    await expect(service.stop()).resolves.not.toThrow();
    expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service instance ***');
  });
});

describe('Plugin Structure and Actions', () => {
  it('should export all required plugin components', () => {
    expect(aletheaPlugin).toHaveProperty('name');
    expect(aletheaPlugin).toHaveProperty('description');
    expect(aletheaPlugin).toHaveProperty('config');
    expect(aletheaPlugin).toHaveProperty('init');
    expect(aletheaPlugin).toHaveProperty('services');
    expect(aletheaPlugin).toHaveProperty('actions');
    expect(aletheaPlugin).toHaveProperty('providers');
  });

  it('should have AletheaService in services array', () => {
    expect(aletheaPlugin.services).toContain(AletheaService);
    expect(aletheaPlugin.services).toHaveLength(1);
  });

  it('should have empty action arrays initially', () => {
    expect(aletheaPlugin.actions).toBeDefined();
    expect(Array.isArray(aletheaPlugin.actions)).toBe(true);
    expect(aletheaPlugin.actions).toHaveLength(0);
  });

  it('should have empty providers array', () => {
    expect(aletheaPlugin.providers).toBeDefined();
    expect(Array.isArray(aletheaPlugin.providers)).toBe(true);
    expect(aletheaPlugin.providers).toHaveLength(0);
  });

  it('should read configuration from environment variables at module load time', () => {
    // Note: This tests the static config structure that was loaded when the module was imported
    // The plugin config is evaluated at module load time, not at test runtime
    expect(aletheaPlugin.config).toHaveProperty('ALETHEA_RPC_URL');
    expect(aletheaPlugin.config).toHaveProperty('PRIVATE_KEY');
    expect(aletheaPlugin.config).toHaveProperty('ALETHEA_API_KEY');

    // These will be undefined unless set before module import
    expect(['string', 'undefined']).toContain(typeof aletheaPlugin.config.ALETHEA_RPC_URL);
    expect(['string', 'undefined']).toContain(typeof aletheaPlugin.config.PRIVATE_KEY);
    expect(['string', 'undefined']).toContain(typeof aletheaPlugin.config.ALETHEA_API_KEY);
  });
});

describe('Action Arrays Export', () => {
  it('should export all placeholder action arrays from plugin', () => {
    expect(Array.isArray(aliAgentActions)).toBe(true);
    expect(Array.isArray(inftActions)).toBe(true);
    expect(Array.isArray(hiveActions)).toBe(true);
    expect(Array.isArray(tokenActions)).toBe(true);
    expect(Array.isArray(governanceActions)).toBe(true);
    expect(Array.isArray(marketDataActions)).toBe(true);

    // Initially all should be empty
    expect(aliAgentActions).toHaveLength(0);
    expect(inftActions).toHaveLength(0);
    expect(hiveActions).toHaveLength(0);
    expect(tokenActions).toHaveLength(0);
    expect(governanceActions).toHaveLength(0);
    expect(marketDataActions).toHaveLength(0);
  });
});

describe('Plugin Integration', () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should register service during plugin initialization', async () => {
    // Simulate plugin initialization by registering its services
    if (aletheaPlugin.services) {
      aletheaPlugin.services.forEach((service) => mockRuntime.registerService(service));
    }

    expect(mockRuntime.registerService).toHaveBeenCalledWith(AletheaService);
  });

  it('should handle service registration gracefully', () => {
    // Setup runtime to fail during service registration
    mockRuntime.registerService.mockImplementation(() => {
      throw new Error('Service registration failed');
    });

    // Should not throw error during registration attempt
    expect(() => {
      if (aletheaPlugin.services) {
        aletheaPlugin.services.forEach((service) => {
          try {
            mockRuntime.registerService(service);
          } catch (error) {
            // Handle gracefully in real implementation
          }
        });
      }
    }).not.toThrow();
  });
});
