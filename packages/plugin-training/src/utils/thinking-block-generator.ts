import {
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import {
  type ThinkingBlock,
  type CodeGenerationSuccess,
  type PluginCreationEvent,
  type MCPCreationEvent,
} from '../types.js';

/**
 * Generates thinking blocks for successful code completions
 * Creates "perfect first-time" reasoning paths for training data
 */
export class ThinkingBlockGenerator {
  constructor(private runtime: IAgentRuntime) {}

  /**
   * Generate thinking block for successful plugin creation
   */
  async generatePluginThinking(
    event: PluginCreationEvent,
    success: CodeGenerationSuccess
  ): Promise<ThinkingBlock> {
    const startTime = Date.now();

    const thinking = await this.generateThinkingContent({
      type: 'plugin-creation',
      request: event.originalRequest || '',
      context: event.context,
      solution: success,
      files: success.files || [],
      outcome: event.outcome,
    });

    return {
      id: `thinking-${Date.now()}`,
      type: 'plugin-creation',
      content: thinking,
      thinking,
      request: event.originalRequest,
      solution: success.solution,
      files: success.files,
      outcome: event.outcome,
      generatedAt: new Date(),
      tokensUsed: this.estimateTokens(thinking),
      executionTime: Date.now() - startTime,
      metadata: {
        complexity: this.assessComplexity(success.files || []),
        domain: event.outcome.pluginType || 'plugin',
        duration_ms: Date.now() - startTime,
        step_count: (success.files || []).length + 2,
        confidence: 0.95,
      },
    };
  }

  /**
   * Generate thinking block for successful MCP creation
   */
  async generateMCPThinking(
    event: MCPCreationEvent,
    success: CodeGenerationSuccess
  ): Promise<ThinkingBlock> {
    const startTime = Date.now();

    const thinking = await this.generateThinkingContent({
      type: 'mcp-creation',
      request: event.originalRequest || '',
      context: event.context,
      solution: success,
      files: success.files || [],
      outcome: event.outcome,
    });

    return {
      id: `thinking-${Date.now()}`,
      type: 'mcp-creation',
      content: thinking,
      thinking,
      request: event.originalRequest,
      solution: success.solution,
      files: success.files,
      outcome: event.outcome,
      generatedAt: new Date(),
      tokensUsed: this.estimateTokens(thinking),
      executionTime: Date.now() - startTime,
      metadata: {
        complexity: this.assessComplexity(success.files || []),
        domain: event.outcome.mcpType || 'mcp',
        duration_ms: Date.now() - startTime,
        step_count: (success.files || []).length + 2,
        confidence: 0.95,
      },
    };
  }

  /**
   * Generate comprehensive thinking content
   */
  private async generateThinkingContent(params: {
    type: string;
    request: string;
    context: any;
    solution: CodeGenerationSuccess;
    files: Array<{path: string, content: string}>;
    outcome: any;
  }): Promise<string> {
    const { type, request, context, solution, files, outcome } = params;

    let thinking = `<thinking>\n`;
    
    // 1. Analyze the request
    thinking += `The user is asking me to ${this.analyzeRequestType(request)}. Let me break this down:\n\n`;
    
    // 2. Understand requirements
    thinking += `Requirements Analysis:\n`;
    thinking += await this.analyzeRequirements(request, context);
    thinking += `\n`;

    // 3. Plan the architecture
    thinking += `Architecture Planning:\n`;
    thinking += await this.planArchitecture(type, request, files);
    thinking += `\n`;

    // 4. Implementation strategy
    thinking += `Implementation Strategy:\n`;
    thinking += await this.planImplementation(files, outcome);
    thinking += `\n`;

    // 5. File structure reasoning
    thinking += `File Structure Reasoning:\n`;
    thinking += await this.explainFileStructure(files);
    thinking += `\n`;

    // 6. Code implementation logic
    thinking += `Code Implementation Logic:\n`;
    thinking += await this.explainImplementation(files, outcome);
    thinking += `\n`;

    // 7. Testing and validation approach
    thinking += `Testing and Validation:\n`;
    thinking += await this.explainTesting(files, outcome);
    thinking += `\n`;

    // 8. Final verification
    thinking += `Final Verification:\n`;
    thinking += `This implementation should successfully create a ${type} that:\n`;
    thinking += await this.summarizeCapabilities(outcome);
    
    thinking += `</thinking>\n`;

    return thinking;
  }

  private analyzeRequestType(request: string): string {
    if (request.toLowerCase().includes('plugin')) {
      return 'create a new ElizaOS plugin';
    } else if (request.toLowerCase().includes('mcp')) {
      return 'create a new MCP (Model Context Protocol) server';
    } else {
      return 'generate code solution';
    }
  }

  private async analyzeRequirements(request: string, context: any): Promise<string> {
    let analysis = '';
    
    // Extract key requirements from the request
    const requirements = this.extractRequirements(request);
    
    analysis += `- Primary Goal: ${requirements.primary}\n`;
    
    if (requirements.features.length > 0) {
      analysis += `- Required Features:\n`;
      requirements.features.forEach(feature => {
        analysis += `  * ${feature}\n`;
      });
    }

    if (requirements.constraints.length > 0) {
      analysis += `- Constraints:\n`;
      requirements.constraints.forEach(constraint => {
        analysis += `  * ${constraint}\n`;
      });
    }

    if (context?.dependencies) {
      analysis += `- Dependencies: ${context.dependencies.join(', ')}\n`;
    }

    return analysis;
  }

  private async planArchitecture(type: string, request: string, files: Array<{path: string, content: string}>): Promise<string> {
    let plan = '';

    if (type === 'plugin-creation') {
      plan += `For an ElizaOS plugin, I need to follow the standard plugin architecture:\n`;
      plan += `- Main plugin file (index.ts) with Plugin interface implementation\n`;
      plan += `- Actions for user interactions\n`;
      plan += `- Providers for context injection\n`;
      plan += `- Services for stateful functionality (if needed)\n`;
      plan += `- Proper TypeScript types and interfaces\n`;
    } else if (type === 'mcp-creation') {
      plan += `For an MCP server, I need to implement:\n`;
      plan += `- MCP server initialization and connection handling\n`;
      plan += `- Tool definitions and implementations\n`;
      plan += `- Proper request/response handling\n`;
      plan += `- Error handling and validation\n`;
    }

    plan += `\nFile structure analysis shows ${files.length} files needed:\n`;
    files.forEach(file => {
      plan += `- ${file.path}: ${this.describeFilePurpose(file)}\n`;
    });

    return plan;
  }

  private describeFilePurpose(file: {path: string, content: string}): string {
    const path = file.path;
    if (path.includes('action')) return 'Action implementation';
    if (path.includes('provider')) return 'Provider implementation';
    if (path.includes('service')) return 'Service implementation';
    if (path.includes('evaluator')) return 'Evaluator implementation';
    if (path.includes('index')) return 'Plugin entry point';
    if (path.includes('test')) return 'Test file';
    if (path.includes('types')) return 'Type definitions';
    return 'Implementation file';
  }

  private async planImplementation(files: Array<{path: string, content: string}>, outcome: any): Promise<string> {
    let plan = '';

    plan += `Implementation will proceed in logical order:\n`;
    plan += `1. Set up core types and interfaces\n`;
    plan += `2. Implement main functionality\n`;
    plan += `3. Add supporting utilities\n`;
    plan += `4. Integrate with ElizaOS patterns\n`;
    plan += `5. Add comprehensive error handling\n`;

    if (outcome.dependencies && outcome.dependencies.length > 0) {
      plan += `\nDependencies to include: ${outcome.dependencies.join(', ')}\n`;
    }

    return plan;
  }

  private async explainFileStructure(files: Array<{path: string, content: string}>): Promise<string> {
    let explanation = '';

    files.forEach(file => {
      const purpose = this.describeFileDetailedPurpose(file);
      explanation += `${file.path}:\n`;
      explanation += `  Purpose: ${purpose}\n`;
      explanation += `  Key components: ${this.identifyKeyComponents(file.content)}\n\n`;
    });

    return explanation;
  }

  private async explainImplementation(files: Array<{path: string, content: string}>, outcome: any): Promise<string> {
    let explanation = '';

    explanation += `The implementation follows these key principles:\n`;
    explanation += `- Type safety with comprehensive TypeScript interfaces\n`;
    explanation += `- ElizaOS architectural patterns and conventions\n`;
    explanation += `- Proper error handling and logging\n`;
    explanation += `- Clear separation of concerns\n`;
    explanation += `- Extensible and maintainable code structure\n\n`;

    // Analyze specific implementation details
    files.forEach(file => {
      if (file.path.includes('index.ts')) {
        explanation += `Main plugin/module file implements core functionality:\n`;
        explanation += this.analyzeMainFile(file.content);
      } else if (file.path.includes('action')) {
        explanation += `Action files handle user interactions:\n`;
        explanation += this.analyzeActionFile(file.content);
      } else if (file.path.includes('provider')) {
        explanation += `Provider files inject context:\n`;
        explanation += this.analyzeProviderFile(file.content);
      }
    });

    return explanation;
  }

  private async explainTesting(files: Array<{path: string, content: string}>, outcome: any): Promise<string> {
    let testing = '';

    testing += `Testing approach for this implementation:\n`;
    testing += `- Unit tests for individual functions\n`;
    testing += `- Integration tests with ElizaOS runtime\n`;
    testing += `- End-to-end workflow testing\n`;
    testing += `- Error scenario validation\n`;

    const hasTests = files.some(file => file.path.includes('test') || file.path.includes('spec'));
    if (hasTests) {
      testing += `- Test files included in implementation\n`;
    } else {
      testing += `- Test files should be added for production use\n`;
    }

    return testing;
  }

  private async summarizeCapabilities(outcome: any): Promise<string> {
    let summary = '';

    if (outcome.pluginName) {
      summary += `- Function as a complete ElizaOS plugin named "${outcome.pluginName}"\n`;
      summary += `- Integrate seamlessly with the ElizaOS runtime\n`;
      summary += `- Provide the specified functionality through actions and providers\n`;
    }

    if (outcome.mcpName) {
      summary += `- Function as a complete MCP server named "${outcome.mcpName}"\n`;
      summary += `- Handle MCP protocol communication\n`;
      summary += `- Provide the specified tools and capabilities\n`;
    }

    summary += `- Handle errors gracefully and provide meaningful feedback\n`;
    summary += `- Follow best practices for maintainability and extensibility\n`;

    return summary;
  }

  private extractRequirements(request: string): {
    primary: string;
    features: string[];
    constraints: string[];
  } {
    const primary = request.split('.')[0] || request.substring(0, 100);
    
    const features: string[] = [];
    const constraints: string[] = [];

    // Extract features (things the user wants)
    const featurePatterns = [
      /should (.*?)(?:\.|$)/gi,
      /needs? to (.*?)(?:\.|$)/gi,
      /must (.*?)(?:\.|$)/gi,
      /will (.*?)(?:\.|$)/gi,
    ];

    featurePatterns.forEach(pattern => {
      const matches = request.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          features.push(match[1].trim());
        }
      }
    });

    // Extract constraints
    const constraintPatterns = [
      /cannot (.*?)(?:\.|$)/gi,
      /shouldn't (.*?)(?:\.|$)/gi,
      /avoid (.*?)(?:\.|$)/gi,
      /without (.*?)(?:\.|$)/gi,
    ];

    constraintPatterns.forEach(pattern => {
      const matches = request.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          constraints.push(match[1].trim());
        }
      }
    });

    return { primary, features, constraints };
  }

  private describeFileContentPurpose(file: {path: string, content: string}): string {
    if (file.path.includes('index.ts')) {
      return 'Main entry point and plugin/module definition';
    } else if (file.path.includes('action')) {
      return 'Action handlers for user interactions';
    } else if (file.path.includes('provider')) {
      return 'Context providers for runtime information';
    } else if (file.path.includes('service')) {
      return 'Stateful services for persistent functionality';
    } else if (file.path.includes('types')) {
      return 'TypeScript type definitions and interfaces';
    } else if (file.path.includes('utils')) {
      return 'Utility functions and helpers';
    } else if (file.path.includes('test')) {
      return 'Test cases and testing utilities';
    }
    return 'Supporting module';
  }

  private describeFileDetailedPurpose(file: {path: string, content: string}): string {
    const basicPurpose = this.describeFileContentPurpose(file);
    
    // Analyze content for more specific purpose
    if (file.content.includes('export const') && file.content.includes('Action')) {
      return `${basicPurpose} - Implements specific actions for user commands`;
    } else if (file.content.includes('export const') && file.content.includes('Provider')) {
      return `${basicPurpose} - Provides runtime context and information`;
    } else if (file.content.includes('export class') && file.content.includes('Service')) {
      return `${basicPurpose} - Manages stateful operations and external integrations`;
    }

    return basicPurpose;
  }

  private identifyKeyComponents(content: string): string {
    const components: string[] = [];

    if (content.includes('export const') && content.includes('Action')) {
      components.push('Actions');
    }
    if (content.includes('export const') && content.includes('Provider')) {
      components.push('Providers');
    }
    if (content.includes('export class') && content.includes('Service')) {
      components.push('Services');
    }
    if (content.includes('interface ') || content.includes('type ')) {
      components.push('TypeScript definitions');
    }
    if (content.includes('export default')) {
      components.push('Default export');
    }

    return components.join(', ') || 'Code implementation';
  }

  private analyzeMainFile(content: string): string {
    let analysis = '';
    
    if (content.includes('Plugin')) {
      analysis += '- Defines the main plugin configuration\n';
      analysis += '- Registers actions, providers, and services\n';
      analysis += '- Handles plugin initialization\n';
    }

    if (content.includes('init:')) {
      analysis += '- Includes initialization logic\n';
    }

    return analysis;
  }

  private analyzeActionFile(content: string): string {
    return '- Implements action handlers with validation and execution logic\n' +
           '- Provides user-facing functionality\n' +
           '- Includes proper error handling and responses\n';
  }

  private analyzeProviderFile(content: string): string {
    return '- Supplies contextual information to the runtime\n' +
           '- Enhances agent decision-making with relevant data\n' +
           '- Follows ElizaOS provider patterns\n';
  }

  private assessComplexity(files: Array<{path: string, content: string}>): 'simple' | 'medium' | 'complex' {
    const totalLines = files.reduce((sum, file) => sum + file.content.split('\n').length, 0);
    const fileCount = files.length;

    if (fileCount <= 2 && totalLines < 200) return 'simple';
    if (fileCount <= 5 && totalLines < 500) return 'medium';
    return 'complex';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}