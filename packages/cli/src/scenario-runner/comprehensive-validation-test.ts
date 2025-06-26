/**
 * Comprehensive Scenario Validation Test
 * Tests the enhanced scenario system with real LLM verification
 */

import { logger } from '@elizaos/core';
import { executeRealScenario, type RealScenarioOptions } from './real-scenario-execution.js';

export interface ComprehensiveTestResult {
  testName: string;
  scenariosPassed: number;
  scenariosTotal: number;
  averageScore: number;
  detailedResults: Array<{
    scenarioName: string;
    passed: boolean;
    score: number;
    verificationDetails: Array<{
      ruleType: string;
      passed: boolean;
      score: number;
      reason: string;
    }>;
  }>;
  summary: {
    llmVerificationTests: number;
    responseQualityTests: number;
    messageProcessingTests: number;
    responseCountTests: number;
    allTestsPassed: boolean;
  };
}

/**
 * Comprehensive test scenarios that validate real agent behavior
 */
const COMPREHENSIVE_TEST_SCENARIOS = [
  {
    id: 'greeting-response-test',
    name: 'Basic Greeting Response Test',
    characters: [
      {
        id: 'test-agent-1',
        name: 'Alice',
        bio: 'I am Alice, a friendly AI assistant who loves to help people.',
        system: 'You are Alice. Always greet users warmly and offer help.',
        plugins: [],
      },
    ],
    script: {
      steps: [
        {
          type: 'message',
          content: 'Hello! How are you today?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
      ],
    },
    verification: {
      rules: [
        {
          id: 'greeting-llm-check',
          type: 'llm',
          description: 'Agent should respond with a warm greeting and offer to help',
          prompt:
            'Check if the agent responded with a greeting and offered assistance or asked how they could help',
        },
        {
          id: 'response-count-check',
          type: 'response_count',
          minCount: 1,
          maxCount: 2,
        },
        {
          id: 'response-quality-check',
          type: 'response_quality',
          minimumScore: 0.7,
        },
        {
          id: 'message-processing-check',
          type: 'message_processing',
          minimumProcessingRatio: 1.0,
          maxErrorRatio: 0.0,
        },
      ],
    },
  },
  {
    id: 'question-answering-test',
    name: 'Question Answering Test',
    characters: [
      {
        id: 'test-agent-2',
        name: 'Bob',
        bio: 'I am Bob, a knowledgeable AI assistant who provides helpful information.',
        system:
          "You are Bob. Answer questions helpfully and accurately. If you don't know something, say so.",
        plugins: [],
      },
    ],
    script: {
      steps: [
        {
          type: 'message',
          content: 'What is the capital of France?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
        {
          type: 'message',
          content: 'Can you tell me about photosynthesis?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
      ],
    },
    verification: {
      rules: [
        {
          id: 'knowledge-llm-check',
          type: 'llm',
          description:
            'Agent should provide accurate information about the capital of France (Paris) and photosynthesis',
          prompt:
            'Check if the agent correctly identified Paris as the capital of France and provided a reasonable explanation of photosynthesis',
        },
        {
          id: 'multiple-response-count',
          type: 'response_count',
          minCount: 2,
          maxCount: 4,
        },
        {
          id: 'informative-quality-check',
          type: 'response_quality',
          minimumScore: 0.8,
        },
      ],
    },
  },
  {
    id: 'conversation-flow-test',
    name: 'Conversation Flow Test',
    characters: [
      {
        id: 'test-agent-3',
        name: 'Charlie',
        bio: 'I am Charlie, a conversational AI who maintains context and engages naturally.',
        system:
          'You are Charlie. Maintain conversation context and respond naturally to follow-up questions.',
        plugins: [],
      },
    ],
    script: {
      steps: [
        {
          type: 'message',
          content: "I'm planning a trip to Japan.",
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
        {
          type: 'message',
          content: 'What should I visit in Tokyo?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
        {
          type: 'message',
          content: 'How long should I stay there?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
      ],
    },
    verification: {
      rules: [
        {
          id: 'context-awareness-llm-check',
          type: 'llm',
          description:
            'Agent should maintain context about the Japan trip and provide relevant travel advice for Tokyo',
          prompt:
            'Check if the agent understood the context of planning a Japan trip and provided relevant advice about Tokyo attractions and trip duration',
        },
        {
          id: 'conversation-response-count',
          type: 'response_count',
          minCount: 3,
          maxCount: 6,
        },
        {
          id: 'contextual-quality-check',
          type: 'response_quality',
          minimumScore: 0.8,
        },
        {
          id: 'conversation-processing-check',
          type: 'message_processing',
          minimumProcessingRatio: 1.0,
          maxErrorRatio: 0.0,
        },
      ],
    },
  },
  {
    id: 'error-handling-test',
    name: 'Error Handling and Edge Cases Test',
    characters: [
      {
        id: 'test-agent-4',
        name: 'Diana',
        bio: 'I am Diana, a robust AI assistant who handles unusual requests gracefully.',
        system:
          'You are Diana. Handle unclear or unusual requests gracefully. Ask for clarification when needed.',
        plugins: [],
      },
    ],
    script: {
      steps: [
        {
          type: 'message',
          content: 'gjhfgjhfgjh',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
        {
          type: 'message',
          content: '',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
        {
          type: 'message',
          content: 'What is the meaning of zxcvbnm?',
          from: 'user',
        },
        {
          type: 'wait',
          duration: 1000,
        },
      ],
    },
    verification: {
      rules: [
        {
          id: 'error-handling-llm-check',
          type: 'llm',
          description:
            'Agent should handle unclear input gracefully and ask for clarification when appropriate',
          prompt:
            "Check if the agent handled unclear or nonsensical input appropriately, asking for clarification or explaining that they don't understand",
        },
        {
          id: 'robust-response-count',
          type: 'response_count',
          minCount: 2, // Should handle at least some of the edge cases
          maxCount: 5,
        },
        {
          id: 'graceful-quality-check',
          type: 'response_quality',
          minimumScore: 0.6, // Lower threshold for edge cases
        },
      ],
    },
  },
];

/**
 * Run comprehensive validation test suite
 */
export async function runComprehensiveValidationTest(
  options: RealScenarioOptions = {}
): Promise<ComprehensiveTestResult> {
  logger.info('[ComprehensiveValidation] Starting comprehensive scenario validation test suite');

  const results: ComprehensiveTestResult = {
    testName: 'Comprehensive Agent Behavior Validation',
    scenariosPassed: 0,
    scenariosTotal: COMPREHENSIVE_TEST_SCENARIOS.length,
    averageScore: 0,
    detailedResults: [],
    summary: {
      llmVerificationTests: 0,
      responseQualityTests: 0,
      messageProcessingTests: 0,
      responseCountTests: 0,
      allTestsPassed: false,
    },
  };

  let totalScore = 0;

  for (const scenario of COMPREHENSIVE_TEST_SCENARIOS) {
    logger.info(`[ComprehensiveValidation] Running scenario: ${scenario.name}`);

    try {
      const scenarioResult = await executeRealScenario(scenario, {
        ...options,
        verbose: true,
        timeout: 30000,
      });

      const scenarioDetails = {
        scenarioName: scenario.name,
        passed: scenarioResult.passed,
        score: scenarioResult.score,
        verificationDetails: scenarioResult.verificationResults.map((vr) => ({
          ruleType: vr.ruleId.includes('llm')
            ? 'llm'
            : vr.ruleId.includes('quality')
              ? 'response_quality'
              : vr.ruleId.includes('processing')
                ? 'message_processing'
                : vr.ruleId.includes('count')
                  ? 'response_count'
                  : 'unknown',
          passed: vr.passed,
          score: vr.score,
          reason: vr.reason || 'No reason provided',
        })),
      };

      results.detailedResults.push(scenarioDetails);

      if (scenarioResult.passed) {
        results.scenariosPassed++;
      }

      totalScore += scenarioResult.score;

      // Count verification test types
      for (const vr of scenarioResult.verificationResults) {
        if (vr.ruleId.includes('llm')) {
          results.summary.llmVerificationTests++;
        }
        if (vr.ruleId.includes('quality')) {
          results.summary.responseQualityTests++;
        }
        if (vr.ruleId.includes('processing')) {
          results.summary.messageProcessingTests++;
        }
        if (vr.ruleId.includes('count')) {
          results.summary.responseCountTests++;
        }
      }

      logger.info(
        `[ComprehensiveValidation] Scenario ${scenario.name}: ${scenarioResult.passed ? 'PASSED' : 'FAILED'} (score: ${scenarioResult.score.toFixed(2)})`
      );
    } catch (error) {
      logger.error(`[ComprehensiveValidation] Scenario ${scenario.name} failed with error:`, error);

      results.detailedResults.push({
        scenarioName: scenario.name,
        passed: false,
        score: 0,
        verificationDetails: [
          {
            ruleType: 'error',
            passed: false,
            score: 0,
            reason: `Scenario execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      });
    }
  }

  results.averageScore = totalScore / results.scenariosTotal;
  results.summary.allTestsPassed = results.scenariosPassed === results.scenariosTotal;

  logger.info('[ComprehensiveValidation] Test suite completed:');
  logger.info(`  Scenarios passed: ${results.scenariosPassed}/${results.scenariosTotal}`);
  logger.info(`  Average score: ${results.averageScore.toFixed(2)}`);
  logger.info(`  LLM verification tests: ${results.summary.llmVerificationTests}`);
  logger.info(`  Response quality tests: ${results.summary.responseQualityTests}`);
  logger.info(`  Message processing tests: ${results.summary.messageProcessingTests}`);
  logger.info(`  Response count tests: ${results.summary.responseCountTests}`);
  logger.info(`  All tests passed: ${results.summary.allTestsPassed ? 'YES' : 'NO'}`);

  return results;
}

/**
 * Generate detailed report of validation results
 */
export function generateValidationReport(results: ComprehensiveTestResult): string {
  let report = '# Comprehensive Agent Validation Report\n\n';

  report += '## Summary\n';
  report += `- **Test Suite**: ${results.testName}\n`;
  report += `- **Scenarios Passed**: ${results.scenariosPassed}/${results.scenariosTotal} (${Math.round((results.scenariosPassed / results.scenariosTotal) * 100)}%)\n`;
  report += `- **Average Score**: ${results.averageScore.toFixed(3)}\n`;
  report += `- **All Tests Passed**: ${results.summary.allTestsPassed ? '✅ YES' : '❌ NO'}\n\n`;

  report += '## Verification Test Coverage\n';
  report += `- **LLM Verification Tests**: ${results.summary.llmVerificationTests}\n`;
  report += `- **Response Quality Tests**: ${results.summary.responseQualityTests}\n`;
  report += `- **Message Processing Tests**: ${results.summary.messageProcessingTests}\n`;
  report += `- **Response Count Tests**: ${results.summary.responseCountTests}\n\n`;

  report += '## Detailed Results\n\n';

  for (const result of results.detailedResults) {
    report += `### ${result.scenarioName}\n`;
    report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Score**: ${result.score.toFixed(3)}\n\n`;

    if (result.verificationDetails.length > 0) {
      report += '**Verification Details:**\n';
      for (const detail of result.verificationDetails) {
        report += `- **${detail.ruleType}**: ${detail.passed ? '✅' : '❌'} (score: ${detail.score.toFixed(3)}) - ${detail.reason}\n`;
      }
      report += '\n';
    }
  }

  return report;
}

/**
 * Run a quick validation check to ensure the system is working
 */
export async function runQuickValidationCheck(): Promise<boolean> {
  logger.info('[ComprehensiveValidation] Running quick validation check...');

  try {
    // Run just the first scenario as a quick check
    const quickScenario = COMPREHENSIVE_TEST_SCENARIOS[0];
    const result = await executeRealScenario(quickScenario, {
      verbose: false,
      timeout: 15000,
    });

    const success = result.passed && result.score > 0.5;
    logger.info(
      `[ComprehensiveValidation] Quick check ${success ? 'PASSED' : 'FAILED'} (score: ${result.score.toFixed(2)})`
    );

    return success;
  } catch (error) {
    logger.error('[ComprehensiveValidation] Quick validation check failed:', error);
    return false;
  }
}
