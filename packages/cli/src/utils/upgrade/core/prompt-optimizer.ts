/**
 * PROMPT OPTIMIZER
 *
 * Dynamic prompt enhancement based on context, failures, and learning.
 * Implements intelligent prompt engineering for optimal AI utilization.
 */

import { logger } from '@elizaos/core';
import type { MigrationContext } from '../types.js';

export interface PromptTemplate {
  id: string;
  pattern: string;
  successRate: number;
  avgCost: number;
  contexts: string[];
}

export interface PromptOptimizationContext {
  file: string;
  content: string;
  previousFailures: string[];
  iteration: number;
  level: number;
}

export class PromptOptimizer {
  private successfulPrompts = new Map<string, PromptTemplate[]>();
  private contextAnalyzer = new ContextAnalyzer();
  private learningDatabase = new PromptLearningDatabase();

  constructor(private context: MigrationContext) {}

  /**
   * Optimize prompt for focused transformation (Level 2)
   */
  async optimizeForFocusedTransform(
    file: string,
    content: string,
    context: MigrationContext,
    iteration: number
  ): Promise<string> {
    logger.info('🎯 Optimizing prompt for focused transformation...');

    const basePrompt = `# Focused ElizaOS V1→V2 Transformation: ${file}

## 🎯 GOAL: Fix specific V1 patterns in this file only

## ⚠️ CRITICAL V2 FIXES TO APPLY:

### Import Changes (MANDATORY):
\`\`\`typescript
// ❌ V1 Wrong:
import { ModelClass, elizaLogger, composeContext } from "@elizaos/core";

// ✅ V2 Correct:
import { ModelType, logger, composePromptFromState } from "@elizaos/core";
import type { IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
\`\`\`

### Code Changes (MANDATORY):
- ModelClass → ModelType
- elizaLogger → logger
- composeContext → composePromptFromState
- generateObject → runtime.useModel
- generateObjectDeprecated → runtime.useModel

## 📁 File to Transform:
\`\`\`typescript
${content}
\`\`\`

Apply ONLY the V2 patterns above. Make minimal changes.`;

    // Add iteration-specific enhancements
    if (iteration > 1) {
      return this.addIterationContext(basePrompt, iteration, context);
    }

    return basePrompt;
  }

  /**
   * Optimize prompt for full context transformation (Level 3)
   */
  async optimizeForFullContext(
    fullContext: string,
    context: MigrationContext,
    iteration: number
  ): Promise<string> {
    logger.info('📋 Optimizing prompt for full context transformation...');

    const contextAnalysis = await this.contextAnalyzer.analyze(fullContext, context);

    let optimizedPrompt = `# Complete ElizaOS V1→V2 Migration with Full Context

## 🎯 COMPREHENSIVE MIGRATION GOAL:
Transform this entire plugin to V2 architecture with complete understanding of the codebase.

## 📊 Context Analysis:
- Plugin Type: ${contextAnalysis.pluginType}
- Complexity: ${contextAnalysis.complexity}
- Dependencies: ${contextAnalysis.dependencies.join(', ')}
- Required Changes: ${contextAnalysis.requiredChanges.join(', ')}

## ⚠️ CRITICAL V2 PATTERNS (based on analysis):

${this.getRelevantPatterns(contextAnalysis)}

## 📁 Full Context:
${fullContext}

Apply comprehensive V2 transformation ensuring all files work together.`;

    // Add learned patterns from similar transformations
    const learnedPatterns = await this.getLearnedPatterns(contextAnalysis);
    if (learnedPatterns.length > 0) {
      optimizedPrompt += `\n\n## 🧠 LEARNED PATTERNS (from successful migrations):\n${learnedPatterns.join('\n')}`;
    }

    return optimizedPrompt;
  }

  /**
   * Optimize prompt for deep reasoning (Level 4)
   */
  async optimizeForDeepReasoning(
    file: string,
    content: string,
    context: MigrationContext,
    turn: number,
    previousResult: any
  ): Promise<string> {
    logger.info(`🧠 Optimizing prompt for deep reasoning turn ${turn}...`);

    let prompt = '';

    if (turn === 1) {
      // Initial analysis turn
      prompt = `# Deep Analysis: ElizaOS V1→V2 Migration Planning

Before making any changes, let's deeply analyze this code:

\`\`\`typescript
${content}
\`\`\`

## 🔍 ANALYSIS QUESTIONS:
1. What V1 patterns are present in this code?
2. What are the exact V2 equivalents for each pattern?
3. What edge cases or complexities do you see?
4. What's the safest transformation approach?
5. What could go wrong with the transformation?

Please provide detailed analysis before suggesting changes.`;
    } else if (turn <= 5) {
      // Iterative refinement turns
      prompt = `# Iterative Refinement Turn ${turn}

Previous attempt result: ${JSON.stringify(previousResult, null, 2)}

## 🔧 REFINEMENT GOALS:
1. Address any issues from the previous attempt
2. Improve the transformation quality
3. Ensure all V2 patterns are correctly applied

Please refine the transformation based on the previous result.`;
    } else {
      // Final validation turns
      prompt = `# Final Validation Turn ${turn}

## ✅ VALIDATION CHECKLIST:
1. All imports are correct V2 patterns
2. All deprecated APIs are replaced
3. Code compiles without errors
4. Semantic meaning is preserved
5. No V1 patterns remain

Please validate and finalize the transformation.`;
    }

    return this.addChainOfThought(prompt);
  }

  /**
   * Optimize prompt for specific AI model
   */
  async optimizeForModel(
    file: string,
    content: string,
    context: MigrationContext,
    model: string,
    iteration: number
  ): Promise<string> {
    logger.info(`🤖 Optimizing prompt for model ${model}...`);

    const modelSpecificPrompt = this.getModelSpecificPrompt(model);

    return `${modelSpecificPrompt}

# ElizaOS V1→V2 Migration Task

File: ${file}

## 📋 Model-Specific Instructions:
${this.getModelInstructions(model)}

## 📁 Code to Transform:
\`\`\`typescript
${content}
\`\`\`

Apply V2 transformation using your model's strengths.`;
  }

  /**
   * Optimize prompt for unlimited power (Level 6+)
   */
  async optimizeForUnlimitedPower(
    file: string,
    content: string,
    context: MigrationContext,
    creativityBoost: number,
    iteration: number
  ): Promise<string> {
    logger.info(
      `🚀 Optimizing prompt for unlimited AI power (creativity boost: ${creativityBoost})...`
    );

    let unlimitedPrompt = `# UNLIMITED AI TRANSFORMATION MODE

## 🚀 NO LIMITS MODE ACTIVATED
- Unlimited cost budget
- Unlimited time budget
- Maximum creativity level: ${creativityBoost}
- Iteration: ${iteration}

## 🎯 ULTIMATE GOAL:
Achieve PERFECT V1→V2 transformation regardless of complexity or effort required.

## 💡 CREATIVE APPROACHES ENCOURAGED:
${this.getCreativeApproaches(creativityBoost)}

## 🔍 COMPREHENSIVE CONTEXT:
File: ${file}
Plugin: ${context.pluginName}
Project Structure: ${JSON.stringify(context.existingFiles)}

## 📁 Code Requiring Perfect Transformation:
\`\`\`typescript
${content}
\`\`\`

## ⚠️ CRITICAL SUCCESS CRITERIA:
1. 100% V2 compliance
2. Zero compilation errors
3. Perfect semantic preservation
4. All edge cases handled
5. Future-proof implementation

Use ANY approach necessary to achieve perfection. No constraints.`;

    // Add all available context and patterns
    const allPatterns = await this.getAllAvailablePatterns();
    unlimitedPrompt += `\n\n## 📚 ALL AVAILABLE PATTERNS:\n${allPatterns}`;

    // Add failure history for learning
    const failureHistory = await this.getFailureHistory(file);
    if (failureHistory.length > 0) {
      unlimitedPrompt += `\n\n## ⚠️ PREVIOUS FAILURES TO AVOID:\n${failureHistory.join('\n')}`;
    }

    return this.addMaximalChainOfThought(unlimitedPrompt);
  }

  /**
   * Add chain-of-thought reasoning to prompt
   */
  private addChainOfThought(prompt: string): string {
    return `${prompt}

<chain_of_thought>
Before providing the transformation, think through:
1. What are the key differences between V1 and V2 for this code?
2. What patterns from the migration guide apply here?
3. What edge cases might cause issues?
4. How can we ensure the transformation is correct?
5. What tests would validate this transformation?

Then provide your reasoning before the final transformation.
</chain_of_thought>`;
  }

  /**
   * Add maximal chain-of-thought for unlimited mode
   */
  private addMaximalChainOfThought(prompt: string): string {
    return `${prompt}

<deep_analysis>
Perform comprehensive analysis:

1. **Pattern Analysis**: Identify ALL V1 patterns in the code
2. **Dependency Analysis**: Map all imports and their V2 equivalents
3. **Complexity Analysis**: Assess transformation difficulty and risks
4. **Edge Case Analysis**: Identify potential failure points
5. **Validation Strategy**: Plan how to verify correctness
6. **Alternative Approaches**: Consider multiple transformation strategies
7. **Risk Mitigation**: Plan for potential issues
8. **Quality Assurance**: Ensure perfect result

Then provide step-by-step transformation with detailed reasoning.
</deep_analysis>

<creative_solutions>
If standard approaches fail, consider:
- Complete file rewrite with semantic preservation
- Advanced pattern matching and replacement
- Context-aware transformations
- Multiple validation passes
- Incremental transformation with checkpoints

No solution is too complex if it achieves perfection.
</creative_solutions>`;
  }

  /**
   * Add iteration-specific context
   */
  private addIterationContext(
    basePrompt: string,
    iteration: number,
    context: MigrationContext
  ): string {
    const iterationContext = `\n\n## 🔄 ITERATION ${iteration} CONTEXT:
Previous attempts may have failed. Apply more thorough analysis and transformation.

## 📊 Previous Issues (if any):
- Build errors from incomplete transformations
- Missing import updates
- Incorrect pattern applications

Focus on comprehensive fixes this iteration.`;

    return basePrompt + iterationContext;
  }

  /**
   * Get relevant patterns based on context analysis
   */
  private getRelevantPatterns(contextAnalysis: any): string {
    // Return patterns based on the specific context
    return `### Action Patterns:
- Handler signature: async (runtime, message, state, options, callback) => void
- State handling: runtime.composeState(message, ['RECENT_MESSAGES'])
- Model usage: runtime.useModel(ModelType.TEXT_LARGE, { prompt })

### Service Patterns (if applicable):
- Class-based services with static serviceType
- start() and stop() lifecycle methods
- capabilityDescription getter`;
  }

  /**
   * Get model-specific instructions
   */
  private getModelInstructions(model: string): string {
    switch (model) {
      case 'claude-opus-4-20250514':
        return `You are Claude Opus - use your advanced reasoning capabilities for complex transformations.
Focus on perfect accuracy and comprehensive analysis.`;

      case 'claude-sonnet-4-20250514':
        return `You are Claude Sonnet - balance speed and accuracy for efficient transformations.
Focus on quick but reliable pattern application.`;

      default:
        return `Apply your model's strengths to achieve optimal transformation quality.`;
    }
  }

  /**
   * Get model-specific prompt prefix
   */
  private getModelSpecificPrompt(model: string): string {
    return `# Model: ${model}
Optimized for: ${this.getModelOptimization(model)}`;
  }

  /**
   * Get model optimization strategy
   */
  private getModelOptimization(model: string): string {
    switch (model) {
      case 'claude-opus-4-20250514':
        return 'Complex reasoning and comprehensive analysis';
      case 'claude-sonnet-4-20250514':
        return 'Balanced speed and accuracy';
      default:
        return 'General purpose transformation';
    }
  }

  /**
   * Get creative approaches for unlimited mode
   */
  private getCreativeApproaches(creativityBoost: number): string {
    const approaches = [
      '- Multi-pass transformation with validation between passes',
      '- Pattern learning from successful migrations',
      '- Context-aware replacements based on surrounding code',
      '- Semantic analysis to preserve intent while updating syntax',
    ];

    if (creativityBoost > 2) {
      approaches.push(
        '- Complete architectural analysis and restructuring if needed',
        '- Advanced dependency resolution and optimization',
        '- Predictive error prevention based on common failure patterns'
      );
    }

    if (creativityBoost > 5) {
      approaches.push(
        '- Revolutionary transformation approaches',
        '- AI-guided test generation and validation',
        '- Cross-file dependency optimization',
        '- Future-proofing against upcoming API changes'
      );
    }

    return approaches.join('\n');
  }

  /**
   * Get all available transformation patterns
   */
  private async getAllAvailablePatterns(): string {
    // Return comprehensive pattern library
    return `All V1→V2 transformation patterns available for reference...`;
  }

  /**
   * Get failure history for learning
   */
  private async getFailureHistory(file: string): Promise<string[]> {
    return this.learningDatabase.getFailureHistory(file);
  }

  /**
   * Get learned patterns from successful transformations
   */
  private async getLearnedPatterns(contextAnalysis: any): Promise<string[]> {
    return this.learningDatabase.getLearnedPatterns(contextAnalysis);
  }

  /**
   * Learn from successful prompt usage
   */
  async learnFromSuccess(
    prompt: string,
    result: any,
    context: PromptOptimizationContext
  ): Promise<void> {
    const template = this.extractTemplate(prompt, result);
    const category = this.categorizeTransform(context);

    if (!this.successfulPrompts.has(category)) {
      this.successfulPrompts.set(category, []);
    }

    this.successfulPrompts.get(category)!.push(template);
    await this.learningDatabase.recordSuccess(template, context);
  }

  /**
   * Extract template from successful prompt
   */
  private extractTemplate(prompt: string, result: any): PromptTemplate {
    return {
      id: `template-${Date.now()}`,
      pattern: prompt.substring(0, 200), // Extract key pattern
      successRate: 1.0,
      avgCost: result.cost || 0,
      contexts: ['default'],
    };
  }

  /**
   * Categorize transformation type
   */
  private categorizeTransform(context: PromptOptimizationContext): string {
    if (context.file.includes('action')) return 'action';
    if (context.file.includes('provider')) return 'provider';
    if (context.file.includes('service')) return 'service';
    return 'general';
  }
}

/**
 * Context Analyzer for understanding code structure
 */
class ContextAnalyzer {
  async analyze(content: string, context: MigrationContext): Promise<any> {
    return {
      pluginType: this.detectPluginType(content),
      complexity: this.assessComplexity(content),
      dependencies: this.extractDependencies(content),
      requiredChanges: this.identifyRequiredChanges(content),
    };
  }

  private detectPluginType(content: string): string {
    if (content.includes('Action')) return 'action';
    if (content.includes('Provider')) return 'provider';
    if (content.includes('Service')) return 'service';
    return 'general';
  }

  private assessComplexity(content: string): string {
    const lines = content.split('\n').length;
    if (lines < 50) return 'simple';
    if (lines < 200) return 'medium';
    return 'complex';
  }

  private extractDependencies(content: string): string[] {
    const importMatches = content.match(/import.*from ['"](.+)['"]/g) || [];
    return importMatches
      .map((match) => {
        const moduleMatch = match.match(/from ['"](.+)['"]/);
        return moduleMatch ? moduleMatch[1] : '';
      })
      .filter(Boolean);
  }

  private identifyRequiredChanges(content: string): string[] {
    const changes: string[] = [];

    if (content.includes('ModelClass')) changes.push('ModelClass→ModelType');
    if (content.includes('elizaLogger')) changes.push('elizaLogger→logger');
    if (content.includes('composeContext')) changes.push('composeContext→composePromptFromState');
    if (content.includes('generateObject')) changes.push('generateObject→runtime.useModel');

    return changes;
  }
}

/**
 * Prompt Learning Database for pattern storage
 */
class PromptLearningDatabase {
  private patterns = new Map<string, any>();
  private failures = new Map<string, string[]>();

  async recordSuccess(template: PromptTemplate, context: PromptOptimizationContext): Promise<void> {
    // Store successful patterns for future use
    const key = `${context.file}-${template.pattern}`;
    this.patterns.set(key, { template, context, timestamp: Date.now() });
  }

  async getFailureHistory(file: string): Promise<string[]> {
    return this.failures.get(file) || [];
  }

  async getLearnedPatterns(contextAnalysis: any): Promise<string[]> {
    // Return patterns relevant to the current context
    return Array.from(this.patterns.values())
      .filter((entry) => this.isRelevant(entry, contextAnalysis))
      .map((entry) => entry.template.pattern);
  }

  private isRelevant(entry: any, contextAnalysis: any): boolean {
    // Determine if a stored pattern is relevant to current context
    return entry.context.file.includes(contextAnalysis.pluginType);
  }
}
