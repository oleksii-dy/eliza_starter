import { getComponentExportName as _getComponentExportName } from './naming-utils.ts';
// Commented out unused imports to fix lint warnings
// import {
//   kebabToCamelCase,
//   sanitizeFileName,
//   toSafeVariableName
// } from './naming-utils.ts';

export const generateActionCode = (
  name: string,
  description: string,
  parameters?: Record<string, any>
): string => {
  const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1);

  return `import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionExample
} from "@elizaos/core";

export const ${camelCaseName}Action: Action = {
  name: "${name}",
  description: "${description}",
  similes: [
    // Add similar phrases that might trigger this action
    "${name.toLowerCase()}",
    "${description.toLowerCase().split(' ').slice(0, 3).join(' ')}"
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Please ${name.toLowerCase()}"
        }
      } as ActionExample,
      {
        name: "agent",
        content: {
          text: "I'll ${description.toLowerCase()} for you."
        }
      } as ActionExample
    ]
  ],
  validate: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ): Promise<boolean> => {
    // Add validation logic here
    const text = _message.content?.text || '';
    return text.length > 0;
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    _callback?: HandlerCallback
  ): Promise<string> => {
    try {
      // Extract parameters from message or options
      const messageText = _message.content?.text || '';
      ${
        parameters
          ? `
      // Expected parameters: ${JSON.stringify(parameters, null, 2)}
      // Extract parameters from the message or options
      const params = _options || { /* empty */ };

      // Destructure and validate required parameters
      const { ${Object.keys(parameters).join(', ')} } = params;

      // Validate required parameters
      ${Object.entries(parameters)
        .map(([key, value]: [string, any]) => {
          if (value.required) {
            return `if (!${key}) {
        return "${key} is required";
      }`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n      ')}
      `
          : ''
      }

      // Implement the action logic
      // For now, we'll acknowledge the request and simulate processing
      const actionDescription = "${description}";
      const responseText = \`I'm now executing the ${name} action to \${actionDescription.toLowerCase()}. This has been completed successfully.\`;

      // You can access runtime services like this:
      // const myService = runtime.getService('MY_SERVICE');

      // For configuration values, use secrets manager when available:
      // const secretsManager = runtime.getService('SECRETS') as EnhancedSecretManager;
      // const apiKey = await secretsManager?.get('API_KEY', { level: 'global', agentId: runtime.agentId, requesterId: runtime.agentId });
      // Or use fallback: const apiKey = runtime.getSetting('API_KEY');

      // Update state if needed
      if (_state) {
        _state.lastAction = "${name}";
        _state.lastActionTime = new Date().toISOString();
      }

      if (_callback) {
        await _callback({
          text: responseText,
          type: "text",
          metadata: {
            action: "${name}",
            success: true,
            timestamp: new Date().toISOString()
          }
        });
      }

      return responseText;
    } catch (_error) {
      const errorMessage = _error instanceof Error
        ? \`Failed to execute ${name}: \${_error.message}\`
        : \`Failed to execute ${name}: Unknown error\`;

      if (_callback) {
        await _callback({
          text: errorMessage,
          type: "error",
          metadata: {
            action: "${name}",
            success: false,
            error: _error instanceof Error ? _error.message : 'Unknown error'
          }
        });
      }

      return errorMessage;
    }
  }
};
`;
};

export const generateProviderCode = (
  name: string,
  description: string,
  dataStructure?: Record<string, any>
): string => {
  const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1);

  return `import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  type ProviderResult
} from "@elizaos/core";

export const ${camelCaseName}: Provider = {
  name: "${name}",
  description: "${description}",
  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    try {
      // Collect contextual data based on the provider's purpose
      const _context = _message.content?.text || '';
      const currentTime = new Date().toISOString();

      ${
        dataStructure
          ? `// Build the expected data structure: ${JSON.stringify(dataStructure, null, 2)}
      const providerData = {
        ${Object.entries(
          dataStructure ||
            {
              /* empty */
            }
        )
          .map(([key, type]) => {
            if (type === 'string') {
              return `${key}: 'Sample ${key} value'`;
            }
            if (type === 'number') {
              return `${key}: 0`;
            }
            if (type === 'boolean') {
              return `${key}: false`;
            }
            if (type === 'array') {
              return `${key}: []`;
            }
            return `${key}: { /* empty */ }`;
          })
          .join(',\n        ')},
        timestamp: currentTime,
        source: "${name}",
        _context: _context.substring(0, 100) // Include some context
      };`
          : `
      // Create provider data based on the description: ${description}
      const providerData = {
        timestamp: currentTime,
        source: "${name}",
        _context: _context.substring(0, 100),
        // Add relevant data fields here based on what this provider should provide
        status: 'active',
        available: true
      };`
      }

      // You can access runtime services and state:
      // const service = runtime.getService('SOME_SERVICE');
      // const lastAction = state.lastAction;

      // Format the data as human-readable text
      const formattedText = \`${name} Information:\\n\` +
        Object.entries(providerData)
          .map(([key, value]) => \`  - \${key}: \${value}\`)
          .join('\\n');

      return {
        text: formattedText,
        data: providerData
      };
    } catch (_error) {
      const errorMsg = _error instanceof Error ? _error.message : 'Unknown error';
      return {
        text: \`Unable to retrieve ${name} data: \${errorMsg}\`,
        data: {
          error: errorMsg,
          timestamp: new Date().toISOString(),
          source: "${name}"
        }
      };
    }
  }
};
`;
};

export const generateServiceCode = (
  name: string,
  description: string,
  methods?: string[]
): string => {
  const className = name.charAt(0).toUpperCase() + name.slice(1);

  return `import { IAgentRuntime, logger, Service } from "@elizaos/core";

// Extend the ServiceTypeRegistry for this service
declare module "@elizaos/core" {
  interface ServiceTypeRegistry {
    ${name.toUpperCase()}: "${name.toLowerCase()}";
  }
}

export class ${className} extends Service {
  static serviceType: "${name.toLowerCase()}" = "${name.toLowerCase()}";

  public readonly capabilityDescription: string = "${description}";

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  async stop(): Promise<void> {
    logger.info(\`Stopping ${className}\`);
    // Clean up any resources used by this service
    // For example: close connections, clear intervals, etc.
    this.cleanupResources();
  }

  private cleanupResources(): void {
    // Implement cleanup logic specific to this service
    logger.debug(\`${className} resources cleaned up\`);
  }

  static async start(_runtime: IAgentRuntime): Promise<${className}> {
    const service = new ${className}(_runtime);
    await service.initialize(_runtime);
    return service;
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {
    this.runtime = _runtime;
    logger.info(\`Initializing ${className}\`);

    // Initialize service resources
    // For example: establish connections, load configuration, etc.
    try {
      // Service-specific initialization
      this.setupInternalState();
      logger.info(\`${className} initialized successfully\`);
    } catch (_error) {
      logger.error(\`Failed to initialize ${className}:\`, _error);
      throw _error;
    }
  }

  private setupInternalState(): void {
    // Initialize any internal state or resources
    logger.debug(\`${className} internal state configured\`);
  }

  ${
    methods
      ? methods
          .map(
            (method) => `
  async ${method}(...args: any[]): Promise<any> {
    logger.info(\`${className}.${method} called with args:\`, args);

    try {
      // Implement the ${method} functionality
      // This is a placeholder that returns a success response
      const result = {
        success: true,
        method: '${method}',
        timestamp: new Date().toISOString(),
        // Add method-specific response data here
      };

      logger.debug(\`${className}.${method} completed successfully\`);
      return result;
    } catch (_error) {
      logger.error(\`${className}.${method} failed:\`, _error);
      throw _error;
    }
  }
  `
          )
          .join('\n')
      : ''
  }

  // Additional service methods
  async getStatus(): Promise<{ active: boolean; uptime: number }> {
    return {
      active: true,
      uptime: Date.now() - (this as any).startTime || 0
    };
  }
}
`;
};

export const generateEvaluatorCode = (
  name: string,
  description: string,
  triggers?: string[]
): string => {
  const camelCaseName = name.charAt(0).toLowerCase() + name.slice(1);

  return `import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger
} from "@elizaos/core";

export const ${camelCaseName}Evaluator: Evaluator = {
  name: "${name}",
  description: "${description}",
  similes: [
    "${name.toLowerCase()}",
    "${description.toLowerCase().split(' ').slice(0, 3).join(' ')}"
  ],
  examples: [
    {
      _context: "When evaluating ${name.toLowerCase()}",
      messages: [
        {
          name: "user",
          content: {
            text: "Analyze this for ${name.toLowerCase()}"
          }
        }
      ],
      expectedOutcome: "Should trigger ${name} evaluation"
    }
  ],
  validate: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ): Promise<boolean> => {
    // Check if this evaluator should run based on message content and state
    const content = _message.content?.text?.toLowerCase() || '';

    ${
      triggers && triggers.length > 0
        ? `// Check against configured triggers: ${triggers.join(', ')}
    const shouldTrigger = ${triggers.map((t) => `content.includes('${t.toLowerCase()}')`).join(' || ')};

    if (!shouldTrigger) {
      return false;
    }`
        : `// Default validation - run on messages with sufficient content
    if (content.length < 5) {
      return false;
    }`
    }

    // Additional validation logic
    // For example, check if enough time has passed since last evaluation
    if (_state?.lastEvaluation) {
      const timeSinceLastEval = Date.now() - new Date(_state.lastEvaluation.timestamp).getTime();
      const minInterval = 60000; // 1 minute minimum between evaluations

      if (timeSinceLastEval < minInterval) {
        elizaLogger.debug(\`${name} evaluator skipped - too soon since last evaluation\`);
        return false;
      }
    }

    return true;
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ): Promise<string> => {
    try {
      elizaLogger.info(\`Running ${name} evaluator\`);

      const content = _message.content?.text || '';

      // Perform evaluation based on the evaluator's purpose
      // Example: sentiment analysis, content moderation, quality check, etc.
      const evaluationCriteria = {
        relevance: content.length > 10 ? 0.8 : 0.3,
        quality: content.includes('please') || content.includes('thank') ? 0.9 : 0.6,
        appropriateness: 1.0, // Assume appropriate unless detected otherwise
      };

      // Calculate overall score
      const scores = Object.values(evaluationCriteria);
      const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const result = {
        evaluated: true,
        score: overallScore,
        criteria: evaluationCriteria,
        details: \`Content evaluated for ${description.toLowerCase()}\`,
        recommendation: overallScore > 0.7 ? 'proceed' : 'review',
        timestamp: new Date().toISOString()
      };

      // Update state with evaluation results if needed
      if (_state) {
        _state.lastEvaluation = {
          evaluator: "${name}",
          score: overallScore,
          timestamp: result.timestamp
        };
      }

      // You can trigger actions based on evaluation results
      // const actions = runtime.getActions();
      // if (overallScore < 0.5 && actions.has('flagContent')) {
      //   await actions.get('flagContent').handler(_runtime, message, state);
      // }

      return \`${name} evaluation complete. Score: \${(overallScore * 100).toFixed(1)}% - \${result.recommendation}\`;
    } catch (_error) {
      elizaLogger.error(\`${name} evaluator error:\`, _error);
      return \`${name} evaluation failed: \${_error instanceof Error ? _error.message : 'Unknown error'}\`;
    }
  }
};
`;
};

export const generatePluginIndex = (pluginName: string, specification: any): string => {
  const cleanPluginName = pluginName.replace(/^@[^/]+\//, '').replace(/[-_]/g, '');
  const pluginClassName = `${cleanPluginName.charAt(0).toUpperCase() + cleanPluginName.slice(1)}Plugin`;

  const imports: string[] = [];
  const exports: string[] = [];

  // Always import from core
  imports.push('import { IAgentRuntime, logger, Plugin } from "@elizaos/core";');

  // Determine if this plugin needs secrets manager based on environment variables
  const needsSecretsManager = specification.environmentVariables?.length > 0;
  if (needsSecretsManager) {
    imports.push('// @ts-ignore - EnhancedSecretManager export issue');
    imports.push('import type EnhancedSecretManager from "@elizaos/plugin-secrets-manager";');
  }

  if (specification.actions?.length) {
    specification.actions.forEach((action: any) => {
      const camelCaseName = action.name.charAt(0).toLowerCase() + action.name.slice(1);
      imports.push(`import { ${camelCaseName}Action } from './actions/${action.name}.ts';`);
      exports.push(`${camelCaseName}Action`);
    });
  }

  if (specification.providers?.length) {
    specification.providers.forEach((provider: any) => {
      const camelCaseName = provider.name.charAt(0).toLowerCase() + provider.name.slice(1);
      // Check if provider.name already ends with "Provider"
      const exportName = provider.name.endsWith('Provider')
        ? camelCaseName
        : `${camelCaseName}Provider`;
      imports.push(`import { ${exportName} } from './providers/${provider.name}.ts';`);
      exports.push(exportName);
    });
  }

  if (specification.services?.length) {
    specification.services.forEach((service: any) => {
      imports.push(`import { ${service.name} } from './services/${service.name}.ts';`);
      exports.push(`${service.name}`);
    });
  }

  if (specification.evaluators?.length) {
    specification.evaluators.forEach((evaluator: any) => {
      const camelCaseName = evaluator.name.charAt(0).toLowerCase() + evaluator.name.slice(1);
      imports.push(
        `import { ${camelCaseName}Evaluator } from './evaluators/${evaluator.name}.ts';`
      );
      exports.push(`${camelCaseName}Evaluator`);
    });
  }

  // Determine dependencies
  const dependencies = specification.dependencies || [];
  if (needsSecretsManager && !dependencies.includes('plugin-env')) {
    dependencies.push('plugin-env');
  }

  return `${imports.join('\n')}

${
  needsSecretsManager
    ? `// Define SecretContext type locally
type SecretContext = {
  level: 'global' | 'user' | 'conversation';
  agentId: string;
  requesterId: string;
};

// Helper functions for secrets manager integration
function getSecretContext(_runtime: IAgentRuntime): SecretContext {
  return {
    level: 'global',
    agentId: _runtime.agentId,
    requesterId: _runtime.agentId
  };
}

async function getConfigValue(_runtime: IAgentRuntime, key: string): Promise<string | undefined> {
  const secretsManager = _runtime.getService('SECRETS') as any;

  if (secretsManager) {
    try {
      const value = await secretsManager.get(key, getSecretContext(_runtime));
      if (value) {
        return value;
      }
    } catch (_error) {
      logger.warn(\`Failed to get \${key} from secrets manager:\`, _error);
    }
  }

  // Fallback to environment variable for backward compatibility
  return process.env[key];
}

async function setConfigValue(
  _runtime: IAgentRuntime,
  key: string,
  value: string,
  metadata?: { type?: string; required?: boolean; sensitive?: boolean }
): Promise<boolean> {
  const secretsManager = _runtime.getService('SECRETS') as any;

  if (secretsManager) {
    try {
      return await secretsManager.set(
        key,
        value,
        getSecretContext(_runtime),
        {
          type: metadata?.type || 'config',
          encrypted: metadata?.sensitive || false,
          plugin: '${pluginName}'
        }
      );
    } catch (_error) {
      logger.error(\`Failed to set \${key} in secrets manager:\`, _error);
    }
  }

  // Fallback to environment variable
  process.env[key] = value;
  return true;
}

`
    : ''
}export const ${pluginClassName}: Plugin = {
  name: "${pluginName}",
  description: "${specification.description}",${
    dependencies.length > 0
      ? `

  // Declare dependencies${needsSecretsManager ? ' including secrets manager for secure configuration' : ''}
  dependencies: [${dependencies.map((d: string) => `'${d}'`).join(', ')}],`
      : ''
  }${
    specification.environmentVariables?.length > 0
      ? `

  // Declare environment variables for secrets manager
  declaredEnvVars: {${specification.environmentVariables
    .map(
      (envVar: any) => `
    '${envVar.name}': {
      type: '${envVar.sensitive ? 'apikey' : 'config'}',
      required: ${envVar.required || false},
      description: '${envVar.description || ''}',
      canGenerate: false
    }`
    )
    .join(',')}
  },`
      : ''
  }${
    needsSecretsManager
      ? `

  async init(_config: Record<string, string>, _runtime: IAgentRuntime) {
    logger.info('Initializing ${pluginName}');

    try {
      // Load and validate configuration using secrets manager${specification.environmentVariables
        ?.map(
          (envVar: any) => `
      const ${envVar.name.toLowerCase()} = config?.${envVar.name} || await getConfigValue(_runtime, '${envVar.name}');${
        envVar.required
          ? `
      if (!${envVar.name.toLowerCase()}) {
        throw new Error('${envVar.name} is required but not configured');
      }`
          : ''
      }

      if (${envVar.name.toLowerCase()}) {
        await setConfigValue(_runtime, '${envVar.name}', ${envVar.name.toLowerCase()}, {
          type: '${envVar.sensitive ? 'apikey' : 'config'}',
          required: ${envVar.required || false},
          sensitive: ${envVar.sensitive || false}
        });
      }`
        )
        .join('\n      ')}

      logger.info('${pluginName} initialized successfully');
    } catch (_error) {
      logger.error('Failed to initialize ${pluginName}:', _error);
      throw _error;
    }
  },`
      : ''
  }${
    specification.actions?.length
      ? `

  actions: [
    ${specification.actions.map((a: any) => `${a.name.charAt(0).toLowerCase() + a.name.slice(1)}Action`).join(',\n    ')}
  ],`
      : ''
  }${
    specification.providers?.length
      ? `

  providers: [
    ${specification.providers
      .map((p: any) => {
        const camelCaseName = p.name.charAt(0).toLowerCase() + p.name.slice(1);
        return p.name.endsWith('Provider') ? camelCaseName : `${camelCaseName}Provider`;
      })
      .join(',\n    ')}
  ],`
      : ''
  }${
    specification.services?.length
      ? `

  services: [
    ${specification.services.map((s: any) => `${s.name}`).join(',\n    ')}
  ],`
      : ''
  }${
    specification.evaluators?.length
      ? `

  evaluators: [
    ${specification.evaluators.map((e: any) => `${e.name.charAt(0).toLowerCase() + e.name.slice(1)}Evaluator`).join(',\n    ')}
  ]`
      : ''
  }
};

// Export individual components for direct use
export {
  ${exports.join(',\n  ')}
};

// Default export
export default ${pluginClassName};
`;
};

export const generateTestCode = (componentName: string, componentType: string): string => {
  const camelCaseName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
  const typeLower = componentType.toLowerCase();

  return `import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ${camelCaseName}${componentType} } from '../${typeLower}s/${componentName}.ts';
import { IAgentRuntime, Memory, State } from '@elizaos/core';

// Mock runtime
const createMockRuntime = (): IAgentRuntime => {
  return {
    getSetting: mock(),
    services: new Map(),
    providers: new Map(),
    actions: new Map(),
    evaluators: new Map()
  } as any;
};

// Mock memory
const createMockMemory = (text: string): Memory => ({
  id: crypto.randomUUID(),
  content: { text },
  userId: 'test-user',
  roomId: 'test-room',
  entityId: 'test-entity',
  createdAt: Date.now()
} as Memory);

describe('${componentName}${componentType}', () => {
  let mockRuntime: IAgentRuntime;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockState = { values: { /* empty */ }, data: { /* empty */ }, text: "" };
    mock.restore();
  });

  it('should be properly defined', () => {
    expect(${camelCaseName}${componentType}).toBeDefined();
    expect(${camelCaseName}${componentType}.name).toBe('${componentName}');
  });

  ${
    componentType === 'Action'
      ? `
  describe('validate', () => {
    it('should validate valid input', async () => {
      const message = createMockMemory('test input');
      const result = await ${camelCaseName}${componentType}.validate(mockRuntime, message, mockState);
      expect(result).toBe(true);
    });

    it('should reject empty input', async () => {
      const message = createMockMemory('');
      const result = await ${camelCaseName}${componentType}.validate(mockRuntime, message, mockState);
      expect(result).toBe(false);
    });
  });

  describe('handler', () => {
    it('should handle valid request', async () => {
      const message = createMockMemory('test request');
      const result = await ${camelCaseName}${componentType}.handler(mockRuntime, message, mockState);
      expect(result).toContain('Successfully');
    });

    it('should handle errors gracefully', async () => {
      const message = createMockMemory('trigger error');
      // TODO: Mock error condition
      const result = await ${camelCaseName}${componentType}.handler(mockRuntime, message, mockState);
      expect(typeof result).toBe('string');
    });
  });
  `
      : ''
  }

  ${
    componentType === 'Provider'
      ? `
  describe('get', () => {
    it('should provide data', async () => {
      const message = createMockMemory('test');
      const result = await ${camelCaseName}${componentType}.get(mockRuntime, message, mockState);
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      // TODO: Mock error condition
      const message = createMockMemory('test');
      const result = await ${camelCaseName}${componentType}.get(mockRuntime, message, mockState);
      expect(result.text).toBeDefined();
    });
  });
  `
      : ''
  }

  ${
    componentType === 'Evaluator'
      ? `
  describe('validate', () => {
    it('should validate when appropriate', async () => {
      const message = createMockMemory('test evaluation');
      const result = await ${camelCaseName}${componentType}.validate(mockRuntime, message, mockState);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('handler', () => {
    it('should evaluate messages', async () => {
      const message = createMockMemory('test evaluation');
      const result = await ${camelCaseName}${componentType}.handler(mockRuntime, message, mockState);
      expect(result).toContain('evaluation');
    });
  });
  `
      : ''
  }

  // TODO: Add more specific tests based on the component's functionality
});
`;
};

// Re-export with old names for backward compatibility
export const actionTemplate = generateActionCode;
export const providerTemplate = generateProviderCode;
export const serviceTemplate = generateServiceCode;
export const evaluatorTemplate = generateEvaluatorCode;
export const pluginIndexTemplate = generatePluginIndex;
export const testTemplate = generateTestCode;
