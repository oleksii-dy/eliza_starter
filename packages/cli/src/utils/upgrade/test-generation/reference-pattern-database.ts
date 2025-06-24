/**
 * REFERENCE PATTERN DATABASE
 *
 * Comprehensive system for cataloging and utilizing working ElizaOS test patterns
 * to guide Claude AI in generating accurate, context-aware tests.
 */

import { logger } from '@elizaos/core';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Test pattern extracted from working test files
 */
interface TestPattern {
  name: string;
  description: string;
  category: 'structure' | 'lifecycle' | 'functionality' | 'error' | 'integration' | 'performance';
  code: string;
  requirements: string[];
  applicableWhen: string[];
}

/**
 * Reference plugin with working tests
 */
interface ReferencePlugin {
  name: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  components: {
    actions: number;
    providers: number;
    services: number;
    evaluators: number;
  };
  testFilePath: string;
  utilsFilePath?: string;
  patterns: TestPattern[];
  specialFeatures: string[];
  testCount: number;
}

/**
 * Comprehensive reference pattern database
 */
export class ReferencePatternDatabase {
  private references: ReferencePlugin[] = [];
  private patternIndex: Map<string, TestPattern[]> = new Map();
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    // Don't call async initializeDatabase in constructor
  }

  /**
   * Initialize the reference database with working examples
   * Must be called after construction for proper async initialization
   */
  async initialize(): Promise<void> {
    await this.initializeDatabase();
  }

  /**
   * Initialize the reference database with working examples (internal method)
   */
  private async initializeDatabase(): Promise<void> {
    logger.info('🔄 Initializing Reference Pattern Database...');

    // Register known working plugins
    this.references = [
      {
        name: 'knowledge',
        description:
          'Comprehensive knowledge management plugin with document processing, RAG, and service lifecycle',
        complexity: 'complex',
        components: {
          actions: 0,
          providers: 1,
          services: 1,
          evaluators: 0,
        },
        testFilePath: 'packages/core/src/plugins/knowledge/test/test.ts', // Hypothetical path
        utilsFilePath: 'packages/core/src/plugins/knowledge/test/utils.ts',
        testCount: 15,
        specialFeatures: [
          'Document processing',
          'Service lifecycle management',
          'Memory operations',
          'Provider integration',
          'Character knowledge processing',
          'Binary file handling',
          'Error handling patterns',
          'Integration workflows',
          'Performance testing',
          'Mock runtime setup',
        ],
        patterns: [], // Will be populated by pattern extraction
      },
      {
        name: 'allora',
        description: 'Blockchain plugin with actions, providers, and configuration validation',
        complexity: 'complex',
        components: {
          actions: 2,
          providers: 2,
          services: 1,
          evaluators: 0,
        },
        testFilePath: 'plugin-allora/src/test/test.ts',
        utilsFilePath: 'plugin-allora/src/test/utils.ts',
        testCount: 12,
        specialFeatures: [
          'Configuration validation',
          'Action structure testing',
          'Provider functionality',
          'Integration workflows',
          'Performance validation',
          'Edge case handling',
        ],
        patterns: [],
      },
      {
        name: 'evm-v2',
        description: 'Advanced EVM blockchain plugin with smart contract interactions',
        complexity: 'complex',
        components: {
          actions: 7,
          providers: 2,
          services: 1,
          evaluators: 0,
        },
        testFilePath: 'plugin-evm-v2/src/tests/index.test.ts',
        testCount: 10,
        specialFeatures: [
          'Smart contract testing',
          'Blockchain interactions',
          'Complex action patterns',
          'Provider mocking',
        ],
        patterns: [],
      },
    ];

    // Extract patterns from available references
    await this.extractAllPatterns();

    logger.info(
      `✅ Reference Pattern Database initialized with ${this.references.length} plugins and ${this.getTotalPatternCount()} patterns`
    );
  }

  /**
   * Extract patterns from all reference plugins
   */
  private async extractAllPatterns(): Promise<void> {
    for (const reference of this.references) {
      try {
        const patterns = await this.extractPatternsFromReference(reference);
        reference.patterns = patterns;

        // Index patterns by category
        for (const pattern of patterns) {
          if (!this.patternIndex.has(pattern.category)) {
            this.patternIndex.set(pattern.category, []);
          }
          const categoryPatterns = this.patternIndex.get(pattern.category);
          if (categoryPatterns) {
            categoryPatterns.push(pattern);
          }
        }
      } catch (error) {
        logger.warn(`⚠️ Could not extract patterns from ${reference.name}:`, error);
      }
    }
  }

  /**
   * Extract patterns from a specific reference plugin
   */
  private async extractPatternsFromReference(reference: ReferencePlugin): Promise<TestPattern[]> {
    const patterns: TestPattern[] = [];

    try {
      // For the knowledge plugin, we'll use the provided test content
      if (reference.name === 'knowledge') {
        return this.extractKnowledgePatterns();
      }

      // For other plugins, try to read from filesystem
      const testPath = path.join(this.workspaceRoot, reference.testFilePath);

      if (await this.fileExists(testPath)) {
        const testContent = await fs.readFile(testPath, 'utf-8');
        return this.extractPatternsFromContent(testContent, reference.name);
      }
    } catch (error) {
      logger.warn(`⚠️ Could not read test file for ${reference.name}`);
    }

    return patterns;
  }

  /**
   * Extract patterns from the knowledge plugin test content
   */
  private extractKnowledgePatterns(): TestPattern[] {
    return [
      {
        name: 'Configuration Testing',
        description: 'Test plugin configuration and environment setup',
        category: 'structure',
        code: `{
  name: "Should handle default docs folder configuration",
  fn: async (runtime: IAgentRuntime) => {
    // Set up environment
    const originalEnv = { ...process.env };
    delete process.env.KNOWLEDGE_PATH;

    try {
      // Check if docs folder exists
      const docsPath = path.join(process.cwd(), "docs");
      const docsExists = fs.existsSync(docsPath);

      if (!docsExists) {
        // Create temporary docs folder
        fs.mkdirSync(docsPath, { recursive: true });
      }

      // Initialize plugin - should use default docs folder
      await knowledgePlugin.init!({}, runtime);

      // Verify no error was thrown
      const errorCalls = mockLogger.error.calls;
      if (errorCalls.length > 0) {
        throw new Error(\`Unexpected error during init: \${errorCalls[0]}\`);
      }

      // Clean up
      if (!docsExists) {
        fs.rmSync(docsPath, { recursive: true, force: true });
      }
    } finally {
      // Restore environment
      process.env = originalEnv;
    }
  },
}`,
        requirements: [
          'Plugin has init function',
          'Uses environment variables',
          'File system interactions',
        ],
        applicableWhen: [
          'Plugin has configuration',
          'Plugin reads from filesystem',
          'Plugin has environment setup',
        ],
      },
      {
        name: 'Service Lifecycle Testing',
        description: 'Test service initialization, registration, and lifecycle',
        category: 'lifecycle',
        code: `{
  name: "Should initialize Service correctly",
  fn: async (runtime: IAgentRuntime) => {
    const service = await Service.start(runtime);

    if (!service) {
      throw new Error("Service initialization failed");
    }

    if (service.capabilityDescription !== "Expected description") {
      throw new Error("Incorrect service capability description");
    }

    // Verify service is registered
    runtime.services.set(Service.serviceType as any, service);
    const retrievedService = runtime.getService(Service.serviceType);

    if (retrievedService !== service) {
      throw new Error("Service not properly registered with runtime");
    }

    await service.stop();
  },
}`,
        requirements: [
          'Plugin has service',
          'Service has start/stop methods',
          'Service has capabilityDescription',
        ],
        applicableWhen: ['Plugin has services', 'Service lifecycle testing needed'],
      },
      {
        name: 'Provider Integration Testing',
        description: 'Test provider functionality and integration with runtime',
        category: 'functionality',
        code: `{
  name: "Should format knowledge in provider output",
  fn: async (runtime: IAgentRuntime) => {
    const service = await Service.start(runtime);
    runtime.services.set("serviceName" as any, service);

    const message: Memory = {
      id: uuidv4() as UUID,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        text: "Test query",
      },
    };

    const state: State = {
      values: {},
      data: {},
      text: "",
    };

    const result = await provider.get(runtime, message, state);

    if (!result.text) {
      throw new Error("Provider returned no text");
    }

    if (!result.text.includes("Expected content")) {
      throw new Error("Provider output missing expected content");
    }

    await service.stop();
  },
}`,
        requirements: [
          'Plugin has providers',
          'Provider has get method',
          'Provider returns formatted state',
        ],
        applicableWhen: ['Plugin has providers', 'Provider testing needed'],
      },
      {
        name: 'Error Handling Testing',
        description: 'Test error handling and edge cases',
        category: 'error',
        code: `{
  name: "Should handle and log errors appropriately",
  fn: async (runtime: IAgentRuntime) => {
    const service = await Service.start(runtime);
    runtime.services.set(Service.serviceType as any, service);

    // Clear previous mock calls
    mockLogger.clearCalls();

    // Test with invalid input
    try {
      await service.someMethod({
        invalidData: null as any,
      });

      throw new Error("Expected error for invalid input");
    } catch (error: any) {
      // Expected to throw - verify it's the right error
      if (!error.message.includes("Expected error message")) {
        throw new Error(\`Unexpected error: \${error.message}\`);
      }
    }

    await service.stop();
  },
}`,
        requirements: ['Plugin has error handling', 'Plugin logs errors'],
        applicableWhen: ['Error handling testing needed', 'Plugin has validation'],
      },
      {
        name: 'Integration Workflow Testing',
        description: 'End-to-end workflow testing with full plugin functionality',
        category: 'integration',
        code: `{
  name: "End-to-end workflow test",
  fn: async (runtime: IAgentRuntime) => {
    // Initialize plugin
    await plugin.init!(config, runtime);

    // Start service
    const service = await Service.start(runtime);
    runtime.services.set(Service.serviceType as any, service);

    // Register provider
    runtime.registerProvider(provider);

    // Test complete workflow
    const inputData = {
      // ... test data
    };

    const result = await service.processData(inputData);

    if (!result.success) {
      throw new Error("Workflow failed");
    }

    // Test provider integration
    const queryMessage: Memory = {
      id: uuidv4() as UUID,
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      roomId: runtime.agentId,
      content: { text: "Test query" },
    };

    const state: State = { values: {}, data: {}, text: "" };
    const providerResult = await provider.get(runtime, queryMessage, state);

    if (!providerResult.text) {
      throw new Error("Provider integration failed");
    }

    await service.stop();
  },
}`,
        requirements: [
          'Plugin has init',
          'Plugin has services and providers',
          'Full workflow available',
        ],
        applicableWhen: ['Integration testing needed', 'Plugin has complete workflow'],
      },
    ];
  }

  /**
   * Extract patterns from test file content
   */
  private extractPatternsFromContent(content: string, pluginName: string): TestPattern[] {
    const patterns: TestPattern[] = [];

    // Extract test objects from the content
    const testPattern = /{\s*name:\s*"([^"]+)",\s*fn:\s*async[^}]+}/gs;
    const matches = content.match(testPattern);

    if (matches) {
      for (const match of matches) {
        const nameMatch = match.match(/name:\s*"([^"]+)"/);
        if (nameMatch) {
          patterns.push({
            name: nameMatch[1],
            description: `Test pattern from ${pluginName}`,
            category: this.categorizePattern(nameMatch[1]),
            code: match,
            requirements: this.extractRequirements(match),
            applicableWhen: this.extractApplicability(match),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Categorize a pattern based on its name and content
   */
  private categorizePattern(name: string): TestPattern['category'] {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('structure') || nameLower.includes('initialization')) {
      return 'structure';
    }
    if (nameLower.includes('service') || nameLower.includes('lifecycle')) {
      return 'lifecycle';
    }
    if (nameLower.includes('error') || nameLower.includes('handle')) {
      return 'error';
    }
    if (nameLower.includes('integration') || nameLower.includes('end-to-end')) {
      return 'integration';
    }
    if (nameLower.includes('performance') || nameLower.includes('large')) {
      return 'performance';
    }

    return 'functionality';
  }

  /**
   * Extract requirements from pattern code
   */
  private extractRequirements(code: string): string[] {
    const requirements: string[] = [];

    if (code.includes('.init!')) requirements.push('Plugin has init function');
    if (code.includes('.start(')) requirements.push('Service has start method');
    if (code.includes('.get(')) requirements.push('Provider has get method');
    if (code.includes('actions') && code.includes('length'))
      requirements.push('Plugin has actions');
    if (code.includes('providers') && code.includes('length'))
      requirements.push('Plugin has providers');
    if (code.includes('services') && code.includes('length'))
      requirements.push('Plugin has services');

    return requirements;
  }

  /**
   * Extract applicability conditions from pattern code
   */
  private extractApplicability(code: string): string[] {
    const applicability: string[] = [];

    if (code.includes('init!')) applicability.push('Plugin has initialization');
    if (code.includes('Service.start')) applicability.push('Plugin has services');
    if (code.includes('provider.get')) applicability.push('Plugin has providers');
    if (code.includes('actions.length')) applicability.push('Plugin has actions');
    if (code.includes('error') || code.includes('Error'))
      applicability.push('Error handling needed');

    return applicability;
  }

  /**
   * Find best matching patterns for a plugin analysis
   */
  findMatchingPatterns(pluginAnalysis: {
    name: string;
    actions: { length: number };
    providers: { length: number };
    services: { length: number };
    complexity: number | string;
    hasActions: boolean;
    hasProviders: boolean;
    hasServices: boolean;
  }): TestPattern[] {
    const matchingPatterns: TestPattern[] = [];

    // Always include structure patterns
    matchingPatterns.push(...(this.patternIndex.get('structure') || []));

    // Add lifecycle patterns if has services
    if (pluginAnalysis.hasServices) {
      matchingPatterns.push(...(this.patternIndex.get('lifecycle') || []));
    }

    // Add functionality patterns based on components
    if (pluginAnalysis.hasActions || pluginAnalysis.hasProviders) {
      matchingPatterns.push(...(this.patternIndex.get('functionality') || []));
    }

    // Always include error handling and integration
    matchingPatterns.push(...(this.patternIndex.get('error') || []));
    matchingPatterns.push(...(this.patternIndex.get('integration') || []));

    // Add performance patterns for complex plugins
    const complexity =
      typeof pluginAnalysis.complexity === 'number'
        ? pluginAnalysis.complexity
        : pluginAnalysis.complexity === 'high'
          ? 8
          : 5;

    if (complexity > 6) {
      matchingPatterns.push(...(this.patternIndex.get('performance') || []));
    }

    return matchingPatterns;
  }

  /**
   * Get best matching reference plugin
   */
  getBestMatchingReference(pluginAnalysis: {
    name: string;
    actions: { length: number };
    providers: { length: number };
    services: { length: number };
    complexity: number | string;
  }): ReferencePlugin | null {
    const scores = this.references.map((ref) => {
      let score = 0;

      // Component similarity (40% weight)
      const actionDiff = Math.abs(ref.components.actions - pluginAnalysis.actions.length);
      const providerDiff = Math.abs(ref.components.providers - pluginAnalysis.providers.length);
      const serviceDiff = Math.abs(ref.components.services - pluginAnalysis.services.length);

      score += (10 - Math.min(10, actionDiff + providerDiff + serviceDiff)) * 0.4;

      // Complexity similarity (30% weight)
      const pluginComplexity =
        typeof pluginAnalysis.complexity === 'number'
          ? pluginAnalysis.complexity
          : pluginAnalysis.complexity === 'high'
            ? 8
            : 5;
      const refComplexity = ref.complexity === 'complex' ? 8 : ref.complexity === 'medium' ? 5 : 2;

      score += (10 - Math.abs(refComplexity - pluginComplexity)) * 0.3;

      // Feature richness (30% weight)
      score += Math.min(10, ref.specialFeatures.length) * 0.3;

      return { reference: ref, score };
    });

    const best = scores.reduce((best, current) => (current.score > best.score ? current : best));

    return best.score > 5 ? best.reference : null;
  }

  /**
   * Generate comprehensive context for Claude AI
   */
  generateClaudeContext(pluginAnalysis: {
    name: string;
    actions: { length: number };
    providers: { length: number };
    services: { length: number };
    complexity: number | string;
    hasActions: boolean;
    hasProviders: boolean;
    hasServices: boolean;
  }): string {
    const matchingPatterns = this.findMatchingPatterns(pluginAnalysis);
    const bestReference = this.getBestMatchingReference(pluginAnalysis);

    let context = `# 📚 REFERENCE PATTERN DATABASE CONTEXT

## 🎯 BEST MATCHING REFERENCE: ${bestReference?.name.toUpperCase() || 'GENERAL PATTERNS'}`;

    if (bestReference) {
      context += `
**Description**: ${bestReference.description}
**Components**: ${bestReference.components.actions} actions, ${bestReference.components.providers} providers, ${bestReference.components.services} services
**Test Count**: ${bestReference.testCount} comprehensive tests
**Special Features**: ${bestReference.specialFeatures.join(', ')}
`;
    }

    context += `\n## 🧩 APPLICABLE PATTERNS (${matchingPatterns.length} patterns found)

### 📋 CRITICAL: Copy these EXACT patterns for your plugin:

`;

    // Include up to 5 most relevant patterns
    const topPatterns = matchingPatterns.slice(0, 5);

    for (const pattern of topPatterns) {
      context += `### ✅ ${pattern.name.toUpperCase()} (${pattern.category})
**Description**: ${pattern.description}
**When to use**: ${pattern.applicableWhen.join(', ')}
**Requirements**: ${pattern.requirements.join(', ')}

**EXACT CODE PATTERN**:
\`\`\`typescript
${pattern.code}
\`\`\`

---

`;
    }

    context += `
## 🎯 GENERATION STRATEGY

1. **Start with Structure Patterns** - Always test plugin structure first
2. **Add Lifecycle Patterns** - If plugin has services, test service lifecycle  
3. **Include Functionality Patterns** - Test actions/providers based on plugin components
4. **Add Error Handling** - Always include error handling tests
5. **End with Integration** - Complete end-to-end workflow tests

**CRITICAL**: Use the EXACT code patterns above. Don't invent new patterns - copy and adapt the proven ones.`;

    return context;
  }

  /**
   * Utility methods
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getTotalPatternCount(): number {
    return Array.from(this.patternIndex.values()).reduce(
      (total, patterns) => total + patterns.length,
      0
    );
  }

  /**
   * Public API methods
   */
  getReferences(): ReferencePlugin[] {
    return [...this.references];
  }

  getPatternsByCategory(category: TestPattern['category']): TestPattern[] {
    return this.patternIndex.get(category) || [];
  }

  getAllPatterns(): TestPattern[] {
    return Array.from(this.patternIndex.values()).flat();
  }
}

/**
 * Factory function to create reference pattern database
 */
export function createReferencePatternDatabase(workspaceRoot: string): ReferencePatternDatabase {
  return new ReferencePatternDatabase(workspaceRoot);
}
