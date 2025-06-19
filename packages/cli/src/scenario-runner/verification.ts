import { logger, type IAgentRuntime } from '@elizaos/core';
import { LLMVerificationEngine } from './llm-verification.js';
import type {
  VerificationRule,
  VerificationResult,
  ScenarioContext,
} from './types.js';

export class ScenarioVerifier {
  private llmEngine: LLMVerificationEngine;

  constructor(runtime: IAgentRuntime) {
    this.llmEngine = new LLMVerificationEngine(runtime);
  }

  async verify(rules: VerificationRule[], context: ScenarioContext): Promise<VerificationResult[]> {
    logger.info(`Starting LLM-powered verification of ${rules.length} rules`);
    
    // All verification is now done through LLM
    const results = await this.llmEngine.verify(rules, context);
    
    // Generate additional tests based on results
    const additionalRules = await this.llmEngine.generateAdditionalTests(context, results);
    
    if (additionalRules.length > 0) {
      logger.info(`Generated ${additionalRules.length} additional verification rules`);
      const additionalResults = await this.llmEngine.verify(additionalRules, context);
      results.push(...additionalResults);
    }
    
    return results;
  }

  async generateDynamicVerificationRules(
    scenario: ScenarioContext,
    userIntent?: string
  ): Promise<VerificationRule[]> {
    const runtime = (this.llmEngine as any).runtime;
    
    const prompt = `You are an expert test designer for AI agent evaluation. Generate comprehensive verification rules for this scenario.

SCENARIO: ${scenario.scenario.name}
DESCRIPTION: ${scenario.scenario.description}
USER INTENT: ${userIntent || 'General comprehensive testing'}

ACTORS:
${scenario.scenario.actors.map(a => `- ${a.name} (${a.role}): ${a.systemPrompt || 'No specific prompt'}`).join('\n')}

Generate 5-8 verification rules that thoroughly test:
1. Core functionality and expected behaviors
2. Edge cases and error handling
3. Inter-actor communication quality
4. Goal achievement and task completion
5. Unexpected or emergent behaviors
6. Security and safety considerations
7. Performance and efficiency aspects

For each rule, provide:
- ID: A unique identifier (use kebab-case)
- DESCRIPTION: What the rule tests (be specific)
- SUCCESS_CRITERIA: Clear, measurable criteria for passing
- PRIORITY: HIGH/MEDIUM/LOW
- CATEGORY: functional/behavioral/performance/security/edge-case

Format your response as:
RULE_1:
ID: [unique-id]
DESCRIPTION: [what this tests]
SUCCESS_CRITERIA: [how to determine success]
PRIORITY: [HIGH/MEDIUM/LOW]
CATEGORY: [category]

Continue with RULE_2, RULE_3, etc.`;

    const { ModelType } = await import('@elizaos/core');
    const response = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      temperature: 0.4,
      maxTokens: 2000,
    }) as string;

    return this.parseGeneratedRules(response);
  }

  private parseGeneratedRules(response: string): VerificationRule[] {
    const rules: VerificationRule[] = [];
    const sections = response.split(/RULE_\d+:/);
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i].trim();
      const lines = section.split('\n');
      
      let id = '';
      let description = '';
      let successCriteria = '';
      let priority = 'MEDIUM';
      let category = 'functional';
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          
          switch (key) {
            case 'id':
              id = value;
              break;
            case 'description':
              description = value;
              break;
            case 'success_criteria':
              successCriteria = value;
              break;
            case 'priority':
              priority = value;
              break;
            case 'category':
              category = value;
              break;
          }
        }
      }
      
      if (id && description) {
        rules.push({
          id,
          type: 'llm',
          description,
          weight: priority === 'HIGH' ? 3 : priority === 'LOW' ? 1 : 2,
          config: {
            successCriteria,
            priority,
            category,
            dynamicallyGenerated: true,
          },
        });
      }
    }
    
    logger.info(`Parsed ${rules.length} verification rules from LLM response`);
    return rules;
  }
}
