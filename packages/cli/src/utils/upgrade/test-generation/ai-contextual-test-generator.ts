/**
 * AI-CONTEXTUAL TEST GENERATOR
 *
 * Revolutionary approach: Instead of rigid templates, this system:
 * 1. Analyzes actual plugin component functionality
 * 2. Gives AI full context about what components do
 * 3. Shows AI CONCRETE WORKING EXAMPLES from proven plugins
 * 4. Lets AI generate comprehensive, contextual tests using proven patterns
 */

import { logger } from '@elizaos/core';
import type { PluginAnalysis } from './types.js';
import type { MigrationContext } from '../types.js';
import type { ClaudeIntegration } from '../core/claude-integration.js';
import { createReferencePatternDatabase } from './reference-pattern-database.js';

/**
 * Component context for AI test generation
 */
interface ComponentContext {
  name: string;
  type: 'action' | 'provider' | 'service';
  description: string;
  functionality: string[];
  testRequirements: string[];
}

/**
 * AI-powered contextual test generator
 */
export class AIContextualTestGenerator {
  private context: MigrationContext;
  private patternDatabase: ReturnType<typeof createReferencePatternDatabase>;

  constructor(context: MigrationContext) {
    this.context = context;
    // Create pattern database (will be initialized in generateContextualTests)
    this.patternDatabase = createReferencePatternDatabase(context.repoPath);
  }

  /**
   * Generate contextual tests using AI with reference patterns
   */
  async generateContextualTests(
    analysis: PluginAnalysis,
    claudeIntegration: ClaudeIntegration,
    context: MigrationContext
  ): Promise<string> {
    try {
      // Initialize pattern database first (critical fix)
      logger.info('🔄 Initializing reference pattern database...');
      await this.patternDatabase.initialize();
      logger.info('✅ Pattern database initialized successfully');

      // Generate enhanced prompt with patterns
      const componentContexts = await this.extractComponentContexts(analysis);
      const enhancedPrompt = await this.buildEnhancedContextualTestPrompt(
        analysis,
        componentContexts
      );

      // Generate test code using Claude
      logger.info('🧠 Generating tests using Claude with enhanced context...');
      const result = await claudeIntegration.runClaudeCodeWithPrompt(enhancedPrompt, context);

      if (!result) {
        throw new Error('Claude returned no test content');
      }

      return result;
    } catch (error) {
      logger.error('❌ Enhanced test generation failed:', error);

      // Fallback to basic test generation without patterns
      logger.info('🛡️ Falling back to basic test generation...');
      return this.generateFallbackTest(analysis);
    }
  }

  /**
   * Generate fallback test when pattern database fails
   */
  private generateFallbackTest(analysis: PluginAnalysis): string {
    logger.info('📝 Generating fallback ElizaOS test...');

    const pluginNameCamel = analysis.name.replace(/[^a-zA-Z0-9]/g, '');
    const pluginNameLower = analysis.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    return `import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
  HandlerCallback,
  State
} from "@elizaos/core";
import { createMockRuntime } from "./utils.js";
import plugin from "../index.js";

export class ${pluginNameCamel}TestSuite implements TestSuite {
  name = "${pluginNameLower}";
  description = "Basic fallback tests for ${analysis.name} plugin";

  tests = [
    {
      name: "Should export plugin correctly",
      fn: async (runtime: IAgentRuntime) => {
        if (!plugin) {
          throw new Error("Plugin not exported");
        }
        
        if (!plugin.name) {
          throw new Error("Plugin missing name");
        }
        
        console.log("✅ Plugin exported correctly");
      },
    },
    {
      name: "Should have valid structure",
      fn: async (runtime: IAgentRuntime) => {
        if (!plugin.name || typeof plugin.name !== 'string') {
          throw new Error("Plugin name invalid");
        }
        
        if (plugin.actions && !Array.isArray(plugin.actions)) {
          throw new Error("Plugin actions should be array");
        }
        
        if (plugin.providers && !Array.isArray(plugin.providers)) {
          throw new Error("Plugin providers should be array");
        }
        
        console.log("✅ Plugin structure valid");
      },
    },
    {
      name: "Should initialize without errors",
      fn: async (runtime: IAgentRuntime) => {
        try {
          if (plugin.init) {
            await plugin.init({}, runtime);
          }
          console.log("✅ Plugin initialized successfully");
        } catch (error: any) {
          throw new Error(\`Plugin initialization failed: \${error.message}\`);
        }
      },
    },
  ];
}

export const test: TestSuite = new ${pluginNameCamel}TestSuite();
export default test;`;
  }

  /**
   * Extract deep context about each component for AI understanding
   */
  private async extractComponentContexts(analysis: PluginAnalysis): Promise<ComponentContext[]> {
    const contexts: ComponentContext[] = [];

    // Extract action contexts
    for (const action of analysis.actions) {
      const context = await this.extractActionContext(action);
      contexts.push(context);
    }

    // Extract provider contexts
    for (const provider of analysis.providers) {
      const context = await this.extractProviderContext(provider);
      contexts.push(context);
    }

    // Extract service contexts
    for (const service of analysis.services) {
      const context = await this.extractServiceContext(service);
      contexts.push(context);
    }

    return contexts;
  }

  /**
   * Extract action context for AI understanding
   */
  private async extractActionContext(
    action: PluginAnalysis['actions'][0]
  ): Promise<ComponentContext> {
    // Analyze action code to understand functionality
    const functionality: string[] = [];
    const testRequirements: string[] = [];

    // TODO: Implement intelligent code analysis
    // This could analyze the handler function to understand:
    // - What APIs it calls
    // - What parameters it expects
    // - What errors it might throw
    // - What external dependencies it uses

    functionality.push(`Processes ${action.name} requests`);
    if (action.description) {
      functionality.push(action.description);
    }

    // Common test requirements for actions
    testRequirements.push('Should export plugin correctly');
    testRequirements.push('Should have valid structure');
    testRequirements.push('Should initialize without errors');

    return {
      name: action.name,
      type: 'action',
      description: action.description || `${action.name} action`,
      functionality,
      testRequirements,
    };
  }

  /**
   * Extract provider context for AI understanding
   */
  private async extractProviderContext(
    provider: PluginAnalysis['providers'][0]
  ): Promise<ComponentContext> {
    const functionality: string[] = [];
    const testRequirements: string[] = [];

    functionality.push(`Provides ${provider.name} data to agents`);
    if (provider.description) {
      functionality.push(provider.description);
    }

    // Common test requirements for providers
    testRequirements.push('Should export plugin correctly');
    testRequirements.push('Should have valid structure');
    testRequirements.push('Should initialize without errors');

    return {
      name: provider.name,
      type: 'provider',
      description: provider.description || `${provider.name} provider`,
      functionality,
      testRequirements,
    };
  }

  /**
   * Extract service context for AI understanding
   */
  private async extractServiceContext(
    service: PluginAnalysis['services'][0]
  ): Promise<ComponentContext> {
    const functionality: string[] = [];
    const testRequirements: string[] = [];

    functionality.push(`Manages ${service.name} service lifecycle`);
    // Note: Service type doesn't have description property
    functionality.push(`Service type: ${service.type}`);

    // Common test requirements for services
    testRequirements.push('Should export plugin correctly');
    testRequirements.push('Should have valid structure');
    testRequirements.push('Should initialize without errors');

    return {
      name: service.name,
      type: 'service',
      description: `${service.name} service (${service.type})`,
      functionality,
      testRequirements,
    };
  }

  /**
   * ENHANCED: Build contextual test generation prompt with proven patterns and working examples
   */
  private async buildEnhancedContextualTestPrompt(
    analysis: PluginAnalysis,
    contexts: ComponentContext[]
  ): Promise<string> {
    // Get proven patterns from the reference database
    const claudeContext = this.patternDatabase.generateClaudeContext(analysis);
    const bestReference = this.patternDatabase.getBestMatchingReference(analysis);

    return `# 🧠 ENHANCED AI-CONTEXTUAL TEST GENERATION - PROVEN PATTERNS + ELIZAOS NATIVE

## 🚫 CRITICAL ANTI-VITEST RULES
- ❌ **NEVER use vitest, jest, or any external test framework**
- ❌ **NEVER import from 'vitest', 'jest', '@testing-library'**
- ❌ **NEVER use describe(), it(), expect(), beforeEach(), afterEach()**
- ✅ **ONLY use ElizaOS native TestSuite interface**
- ✅ **ONLY use console.log() for output and throw Error() for failures**

## 📊 TARGET PLUGIN ANALYSIS
**Plugin Name**: ${analysis.name}
**Description**: ${analysis.description || 'No description provided'}
**Components**: ${analysis.actions.length} actions, ${analysis.providers.length} providers, ${analysis.services.length} services
**Has Service**: ${analysis.hasServices ? 'Yes' : 'No'}
**Has Actions**: ${analysis.hasActions ? 'Yes' : 'No'}
**Has Providers**: ${analysis.hasProviders ? 'Yes' : 'No'}

## 🧩 COMPONENT CONTEXTS
${contexts
  .map(
    (ctx) => `
### ${ctx.type.toUpperCase()}: ${ctx.name}
**Description**: ${ctx.description}
**Functionality**: 
${ctx.functionality.map((f) => `- ${f}`).join('\n')}
**Test Requirements**:
${ctx.testRequirements.map((t) => `- ${t}`).join('\n')}
`
  )
  .join('\n')}

${claudeContext}

## 🏗️ COMPLETE WORKING EXAMPLE FROM KNOWLEDGE PLUGIN

Here's a COMPLETE working ElizaOS test file that you should use as your PRIMARY reference:

\`\`\`typescript
import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
  State,
} from "@elizaos/core";
import { createMockRuntime } from "./utils.js";
import knowledgePlugin from "../index.js";

export class KnowledgeTestSuite implements TestSuite {
  name = "knowledge";
  description = "Tests for the Knowledge plugin including document processing, retrieval, and integration";

  tests = [
    // 1. Configuration Testing Pattern
    {
      name: "Should handle default configuration",
      fn: async (runtime: IAgentRuntime) => {
        const originalEnv = { ...process.env };
        
        try {
          // Test plugin initialization
          await knowledgePlugin.init!({}, runtime);
          
          // Verify no errors
          console.log("✅ Plugin initialization successful");
        } finally {
          process.env = originalEnv;
        }
      },
    },

    // 2. Service Lifecycle Pattern
    {
      name: "Should initialize Service correctly",
      fn: async (runtime: IAgentRuntime) => {
        const service = await Service.start(runtime);

        if (!service) {
          throw new Error("Service initialization failed");
        }

        if (!service.capabilityDescription) {
          throw new Error("Service missing capability description");
        }

        // Verify service registration
        runtime.services.set(Service.serviceType as any, service);
        const retrievedService = runtime.getService(Service.serviceType);

        if (retrievedService !== service) {
          throw new Error("Service not properly registered");
        }

        console.log("✅ Service lifecycle working");
        await service.stop();
      },
    },

    // 3. Provider Integration Pattern  
    {
      name: "Should test provider functionality",
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          id: "test-id" as UUID,
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: "test-room" as UUID,
          content: { text: "Test query" },
        };

        const state: State = { values: {}, data: {}, text: "" };
        const result = await provider.get(runtime, message, state);

        if (!result.text) {
          throw new Error("Provider returned no text");
        }

        console.log("✅ Provider working correctly");
      },
    },

    // 4. Error Handling Pattern
    {
      name: "Should handle errors appropriately",
      fn: async (runtime: IAgentRuntime) => {
        try {
          // Test with invalid input
          await someMethod(null as any);
          throw new Error("Expected error for invalid input");
        } catch (error: any) {
          if (!error.message.includes("expected error text")) {
            throw new Error(\`Unexpected error: \${error.message}\`);
          }
          console.log("✅ Error handling working");
        }
      },
    },

    // 5. Integration Workflow Pattern
    {
      name: "End-to-end workflow test",
      fn: async (runtime: IAgentRuntime) => {
        // Initialize plugin
        await plugin.init!({}, runtime);

        // Start services
        const service = await Service.start(runtime);
        runtime.services.set(Service.serviceType as any, service);

        // Test complete workflow
        const testData = { /* test data */ };
        const result = await service.processData(testData);

        if (!result.success) {
          throw new Error("Workflow failed");
        }

        console.log("✅ End-to-end workflow successful");
        await service.stop();
      },
    },
  ];
}

export default new KnowledgeTestSuite();
\`\`\`

## 🎯 GENERATION REQUIREMENTS FOR ${analysis.name.toUpperCase()} PLUGIN

Generate a **COMPLETE, WORKING test.ts file** using these proven patterns:

### 📝 REQUIRED STRUCTURE:
\`\`\`typescript
import type {
  IAgentRuntime,
  TestSuite,
  Memory,
  UUID,
  Content,
  State,
} from "@elizaos/core";
import { createMockRuntime } from "./utils.js";
import ${analysis.name}Plugin from "../index.js";

export class ${analysis.name.charAt(0).toUpperCase() + analysis.name.slice(1).replace(/[^a-zA-Z0-9]/g, '')}TestSuite implements TestSuite {
  name = "${analysis.name.toLowerCase()}";
  description = "Comprehensive tests for ${analysis.name} plugin - ElizaOS V2 Architecture";

  tests = [
    // COPY THE PROVEN PATTERNS FROM ABOVE AND ADAPT FOR ${analysis.name}
    // 1. Plugin Structure Validation
    // 2. Configuration Testing (if applicable)
    ${analysis.hasServices ? '// 3. Service Lifecycle Testing' : ''}
    ${analysis.hasActions ? '// 4. Action Structure and Execution' : ''}
    ${analysis.hasProviders ? '// 5. Provider Functionality' : ''}
    // 6. Memory Operations  
    // 7. Error Handling
    // 8. Integration Workflow
    // 9-12. ${analysis.name}-specific functionality tests
  ];
}

export default new ${analysis.name.charAt(0).toUpperCase() + analysis.name.slice(1).replace(/[^a-zA-Z0-9]/g, '')}TestSuite();
\`\`\`

## 🚀 CRITICAL INSTRUCTIONS

1. **COPY EXACT PATTERNS**: Use the patterns from the working example above, don't invent new ones
2. **ADAPT TO ${analysis.name}**: Change plugin names, service names, but keep the exact testing logic
3. **TEST REAL FUNCTIONALITY**: Based on the component contexts, test what the plugin actually does
4. **INCLUDE ALL COMPONENTS**: Test actions (${analysis.actions.length}), providers (${analysis.providers.length}), services (${analysis.services.length})
5. **COMPREHENSIVE COVERAGE**: 10-15 tests covering structure, functionality, errors, and integration

Generate the complete, working test.ts file now using the proven patterns:`;
  }
}

/**
 * Factory function to create enhanced contextual test generator
 */
export function createContextualTestGenerator(
  claudeIntegration: ClaudeIntegration,
  context: MigrationContext
): AIContextualTestGenerator {
  return new AIContextualTestGenerator(context);
}

/**
 * Generate contextual tests for a plugin using proven patterns
 */
export async function generateContextualTests(
  analysis: PluginAnalysis,
  claudeIntegration: ClaudeIntegration,
  context: MigrationContext
): Promise<string> {
  const generator = createContextualTestGenerator(claudeIntegration, context);
  return await generator.generateContextualTests(analysis, claudeIntegration, context);
}
