import { IAgentRuntime, ModelType } from '@elizaos/core';
import { parseKeyValueXml } from '@elizaos/core';
import type {
  VerificationRule,
  VerificationResult,
  ScenarioMessage,
  ScenarioContext,
} from './types.js';

export class ScenarioVerifier {
  constructor(private runtime: IAgentRuntime) {}

  async verify(rules: VerificationRule[], context: ScenarioContext): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const rule of rules) {
      const startTime = Date.now();
      try {
        const result = await this.verifyRule(rule, context);
        result.executionTime = Date.now() - startTime;
        results.push(result);
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.description,
          passed: false,
          reason: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
          executionTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  private async verifyRule(
    rule: VerificationRule,
    context: ScenarioContext
  ): Promise<VerificationResult> {
    switch (rule.type) {
      case 'llm':
        return await this.verifyWithLLM(rule, context);
      case 'regex':
        return this.verifyWithRegex(rule, context);
      case 'contains':
        return this.verifyContains(rule, context);
      case 'count':
        return this.verifyCount(rule, context);
      case 'timing':
        return this.verifyTiming(rule, context);
      case 'action_taken':
        return this.verifyActionTaken(rule, context);
      case 'response_quality':
        return await this.verifyResponseQuality(rule, context);
      case 'custom':
        return await this.verifyCustom(rule, context);
      default:
        throw new Error(`Unsupported verification rule type: ${rule.type}`);
    }
  }

  private async verifyWithLLM(
    rule: VerificationRule,
    context: ScenarioContext
  ): Promise<VerificationResult> {
    const transcript = this.formatTranscript(context.transcript);
    const criteria = rule.config.criteria || rule.description;

    const prompt =
      rule.config.llmPrompt ||
      `Analyze this conversation transcript and determine if the following criteria is met: ${criteria}

Transcript:
${transcript}

Scenario Context:
- Scenario: ${context.scenario.name}
- Actors: ${Array.from(context.actors.keys()).join(', ')}
- Expected Outcome: ${context.scenario.verification.groundTruth?.successCriteria?.join(', ') || 'Not specified'}

Provide your analysis in the following format:
<verification>
  <passed>true/false</passed>
  <confidence>0-100</confidence>
  <reason>Detailed explanation of your decision</reason>
  <evidence>Specific examples from the transcript that support your decision</evidence>
</verification>`;

    const response = await this.runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return this.parseVerificationResponse(response, rule);
  }

  private verifyWithRegex(rule: VerificationRule, context: ScenarioContext): VerificationResult {
    const pattern = rule.config.pattern;
    if (!pattern) {
      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: false,
        reason: 'No regex pattern specified in rule configuration',
      };
    }

    const regexPattern = new RegExp(pattern, 'i');
    const transcriptText = context.transcript.map((msg) => msg.content.text || '').join(' ');

    const matches = transcriptText.match(regexPattern);
    const passed = Boolean(matches);

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      reason: passed
        ? `Pattern "${pattern}" found in transcript`
        : `Pattern "${pattern}" not found in transcript`,
      evidence: matches ? matches[0] : null,
    };
  }

  private verifyContains(rule: VerificationRule, context: ScenarioContext): VerificationResult {
    const searchText = rule.config.expectedValue?.toLowerCase() || '';
    const transcriptText = context.transcript
      .map((msg) => msg.content.text || '')
      .join(' ')
      .toLowerCase();

    const passed = transcriptText.includes(searchText);

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      reason: passed
        ? `Text "${rule.config.expectedValue}" found in transcript`
        : `Text "${rule.config.expectedValue}" not found in transcript`,
    };
  }

  private verifyCount(rule: VerificationRule, context: ScenarioContext): VerificationResult {
    const { expectedValue, threshold } = rule.config;
    let actualCount = 0;

    // Count based on what we're measuring
    if (rule.config.criteria === 'messages') {
      actualCount = context.transcript.length;
    } else if (rule.config.criteria === 'actor_messages') {
      const actorId = rule.config.actorId;
      actualCount = context.transcript.filter((msg) => msg.actorId === actorId).length;
    } else if (rule.config.criteria === 'actions') {
      actualCount = Object.values(context.metrics.actionCounts || {}).reduce(
        (sum, count) => sum + count,
        0
      );
    }

    const passed = threshold ? actualCount >= threshold : actualCount === expectedValue;

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      reason: `Expected ${expectedValue || `>=${threshold}`}, got ${actualCount}`,
      evidence: { actualCount, expectedValue, threshold },
    };
  }

  private verifyTiming(rule: VerificationRule, context: ScenarioContext): VerificationResult {
    const { threshold } = rule.config;
    const actualDuration = context.metrics.duration || 0;
    const passed = actualDuration <= (threshold || Infinity);

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      reason: passed
        ? `Completed within ${threshold}ms (actual: ${actualDuration}ms)`
        : `Exceeded time limit of ${threshold}ms (actual: ${actualDuration}ms)`,
      evidence: { actualDuration, threshold },
    };
  }

  private verifyActionTaken(rule: VerificationRule, context: ScenarioContext): VerificationResult {
    const expectedAction = rule.config.expectedValue;
    const actionCounts = context.metrics.actionCounts || {};
    const passed = Boolean(actionCounts[expectedAction]);

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      reason: passed
        ? `Action "${expectedAction}" was taken ${actionCounts[expectedAction]} times`
        : `Action "${expectedAction}" was not taken`,
      evidence: actionCounts,
    };
  }

  private async verifyResponseQuality(
    rule: VerificationRule,
    context: ScenarioContext
  ): Promise<VerificationResult> {
    const subjectActorId = context.scenario.actors.find((a) => a.role === 'subject')?.id;
    if (!subjectActorId) {
      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: false,
        reason: 'No subject actor found for response quality verification',
      };
    }

    const subjectMessages = context.transcript.filter((msg) => msg.actorId === subjectActorId);
    const responses = subjectMessages.map((msg) => msg.content.text || '').join('\n');

    const prompt = `Evaluate the quality of these responses based on the criteria: ${rule.config.criteria}

Responses:
${responses}

Context: ${context.scenario.description}

Rate the response quality on a scale of 1-10 and provide justification:
<evaluation>
  <score>1-10</scale>
  <passed>true/false</ge>
  <reason>Detailed explanation</reason>
</evaluation>`;

    const response = await this.runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return this.parseEvaluationResponse(response, rule);
  }

  private async verifyCustom(
    _rule: VerificationRule,
    _context: ScenarioContext
  ): Promise<VerificationResult> {
    // Custom verification would be implemented by loading and executing
    // a custom function specified in rule.config.customFunction
    throw new Error('Custom verification not yet implemented');
  }

  private parseVerificationResponse(response: string, rule: VerificationRule): VerificationResult {
    try {
      const parsed = parseKeyValueXml(response);
      if (!parsed) {
        throw new Error('Failed to parse LLM response');
      }

      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: parsed.passed === 'true',
        confidence: parsed.confidence ? parseInt(parsed.confidence) : undefined,
        reason: parsed.reason || 'No reason provided',
        evidence: parsed.evidence,
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: false,
        reason: `Failed to parse LLM verification response: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private parseEvaluationResponse(response: string, rule: VerificationRule): VerificationResult {
    try {
      const parsed = parseKeyValueXml(response);
      if (!parsed) {
        throw new Error('Failed to parse LLM response');
      }

      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: parsed.passed === 'true',
        score: parsed.score ? parseInt(parsed.score) : undefined,
        reason: parsed.reason || 'No reason provided',
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.description,
        passed: false,
        reason: `Failed to parse LLM evaluation response: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private formatTranscript(transcript: ScenarioMessage[]): string {
    return transcript
      .map((msg) => {
        const timestamp = new Date(msg.timestamp).toISOString();
        return `[${timestamp}] ${msg.actorName}: ${msg.content.text || ''}`;
      })
      .join('\n');
  }
}
