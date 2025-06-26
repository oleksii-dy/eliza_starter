import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  asUUID,
} from '@elizaos/core';
import { CostTrackingService } from '../services/CostTrackingService.js';

/**
 * Action for verifying that secret messages have been received and stored in memory
 * Provides comprehensive verification report from each agent's perspective
 */
export const verifySecretsAction: Action = {
  name: 'VERIFY_SECRETS',
  similes: [
    'verify secrets',
    'check secrets',
    'verify received secrets',
    'check if secrets received',
    'validate secret exchange',
    'verify memory',
    'check memory for secrets',
    'audit secrets',
    'secret verification',
  ],
  description: 'Verify that secret messages have been received and stored in agent memory',
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Verify that all secrets have been received',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll check my memory to verify which secret messages I've received from other agents.",
          actions: ['VERIFY_SECRETS'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Check if the secret exchange is complete',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll verify the status of secret message exchange and provide a complete audit report.",
          actions: ['VERIFY_SECRETS'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    logger.info('Validating VERIFY_SECRETS action');

    try {
      // Check if message contains verification intent
      const text = message.content.text?.toLowerCase() || '';

      const verifyKeywords = [
        'verify secrets',
        'check secrets',
        'verify received',
        'check if.*received',
        'validate.*exchange',
        'verify memory',
        'check memory',
        'audit secrets',
        'secret verification',
      ];

      const hasVerifyIntent = verifyKeywords.some((keyword) => {
        if (keyword.includes('.*')) {
          const regex = new RegExp(keyword, 'i');
          return regex.test(text);
        }
        return text.includes(keyword);
      });

      logger.info('VERIFY_SECRETS validation', { hasVerifyIntent });
      return hasVerifyIntent;
    } catch (error) {
      logger.error('Error validating VERIFY_SECRETS action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ): Promise<boolean> => {
    logger.info('Executing VERIFY_SECRETS action');

    try {
      const costService = runtime.getService<CostTrackingService>('cost-tracking');

      // Get all memories to search for secrets
      const allMemories = await runtime.getMemories({
        roomId: runtime.agentId,
        count: 500, // Get more memories to ensure we find all secrets
        tableName: 'memories',
      });

      // Define expected secrets from all agents
      const expectedSecrets = {
        'alice-agent': {
          secretMessage: 'The quantum encryption key for the treasury is: QE-7749-ALPHA-MIDNIGHT',
          secretId: 'alice-secret-001',
        },
        'bob-agent': {
          secretMessage:
            'The zero-knowledge proof circuit optimization code is: ZK-COMPACT-9821-BETA',
          secretId: 'bob-secret-002',
        },
        'charlie-agent': {
          secretMessage:
            'The network consensus override protocol is: CONSENSUS-OVERRIDE-4433-GAMMA',
          secretId: 'charlie-secret-003',
        },
      };

      // Get current agent's secret
      const mySecret = expectedSecrets[runtime.agentId as keyof typeof expectedSecrets];

      // Find verification results
      const verification = await performSecretVerification(
        runtime,
        allMemories,
        expectedSecrets,
        mySecret
      );

      // Generate cost analysis
      const costAnalysis = costService
        ? await costService.generateCostReport()
        : 'Cost tracking service not available';

      // Create comprehensive verification report
      const verificationReport = generateVerificationReport(
        runtime.agentId,
        verification,
        costAnalysis
      );

      // Store verification memory
      await runtime.createMemory(
        {
          id: asUUID(`secret-verification-${Date.now()}`),
          agentId: runtime.agentId,
          entityId: runtime.agentId,
          roomId: runtime.agentId,
          content: {
            text: `Secret verification completed: ${verification.receivedSecrets.length}/${verification.expectedSecrets.length} secrets received`,
            source: 'secret-verification',
            actions: ['VERIFY_SECRETS'],
            metadata: {
              verificationResults: verification,
              timestamp: new Date().toISOString(),
            },
          },
          createdAt: Date.now(),
        },
        'memories'
      );

      if (callback) {
        callback({
          text: verificationReport,
          content: {
            verification,
            costAnalysis: costService ? await costService.getSecretSharingCosts() : null,
            completionStatus: verification.isComplete ? 'COMPLETE' : 'INCOMPLETE',
            agentPerspective: runtime.agentId,
          },
        });
      }

      return true;
    } catch (error) {
      logger.error('Error in VERIFY_SECRETS handler:', error);

      if (callback) {
        callback({
          text: `❌ Error verifying secrets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          content: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
      return false;
    }
  },
};

/**
 * Perform comprehensive secret verification
 */
async function performSecretVerification(
  runtime: IAgentRuntime,
  memories: Memory[],
  expectedSecrets: any,
  mySecret: any
): Promise<SecretVerificationResult> {
  const verification: SecretVerificationResult = {
    agentId: runtime.agentId,
    expectedSecrets: Object.keys(expectedSecrets).filter((id) => id !== runtime.agentId),
    receivedSecrets: [],
    mySecretShared: false,
    isComplete: false,
    memoryAnalysis: {
      totalMemories: memories.length,
      secretRelatedMemories: 0,
      verificationTimestamp: new Date(),
    },
  };

  // Check if my secret was shared
  if (mySecret) {
    const mySecretMemory = memories.find(
      (memory) =>
        memory.content.text?.includes(mySecret.secretMessage) &&
        memory.content.text?.includes('SECRET SHARED') &&
        memory.agentId === runtime.agentId
    );
    verification.mySecretShared = !!mySecretMemory;
  }

  // Check for received secrets from other agents
  for (const [agentId, secretData] of Object.entries(expectedSecrets)) {
    if (agentId === runtime.agentId) {
      continue;
    } // Skip own secret

    const data = secretData as any;
    // Look for memories containing this secret
    const secretMemories = memories.filter(
      (memory) =>
        memory.content.text?.includes(data.secretMessage) ||
        memory.content.text?.includes(data.secretId)
    );

    if (secretMemories.length > 0) {
      // Find the most relevant memory (should contain the full secret)
      const primaryMemory =
        secretMemories.find(
          (memory) =>
            memory.content.text?.includes(data.secretMessage) &&
            memory.content.text?.includes('SECRET SHARED')
        ) || secretMemories[0];

      verification.receivedSecrets.push({
        fromAgent: agentId,
        secretId: data.secretId,
        secretMessage: data.secretMessage,
        receivedAt: new Date(primaryMemory.createdAt || Date.now()),
        memoryId: primaryMemory.id || 'unknown',
        verificationStatus: 'VERIFIED',
      });

      verification.memoryAnalysis.secretRelatedMemories += secretMemories.length;
    }
  }

  // Determine completion status
  verification.isComplete =
    verification.receivedSecrets.length === verification.expectedSecrets.length;

  return verification;
}

/**
 * Generate comprehensive verification report
 */
function generateVerificationReport(
  agentId: string,
  verification: SecretVerificationResult,
  costAnalysis: string
): string {
  const completionPercentage =
    (verification.receivedSecrets.length / verification.expectedSecrets.length) * 100;

  let report = `# 🔍 Secret Verification Report - ${agentId}

## 📊 Verification Summary
- **Agent Perspective**: ${agentId}
- **Secrets Expected**: ${verification.expectedSecrets.length}
- **Secrets Received**: ${verification.receivedSecrets.length}
- **Completion**: ${completionPercentage.toFixed(1)}%
- **Status**: ${verification.isComplete ? '✅ COMPLETE' : '⏳ INCOMPLETE'}
- **My Secret Shared**: ${verification.mySecretShared ? '✅ YES' : '❌ NO'}

## 📋 Detailed Verification Results

### Received Secrets:
`;

  if (verification.receivedSecrets.length === 0) {
    report += '❌ **No secrets received yet**\n';
  } else {
    verification.receivedSecrets.forEach((secret, index) => {
      report += `
${index + 1}. **From ${secret.fromAgent}**:
   - **Secret**: "${secret.secretMessage}"
   - **ID**: ${secret.secretId}
   - **Received**: ${secret.receivedAt.toISOString()}
   - **Memory**: ${secret.memoryId}
   - **Status**: ${secret.verificationStatus}
`;
    });
  }

  report += `
### Missing Secrets:
`;

  const missingSecrets = verification.expectedSecrets.filter(
    (agentId) => !verification.receivedSecrets.some((secret) => secret.fromAgent === agentId)
  );

  if (missingSecrets.length === 0) {
    report += '✅ **All secrets received**\n';
  } else {
    missingSecrets.forEach((agentId, index) => {
      report += `${index + 1}. **Missing from ${agentId}** ❌\n`;
    });
  }

  report += `
## 🧠 Memory Analysis
- **Total Memories Searched**: ${verification.memoryAnalysis.totalMemories}
- **Secret-Related Memories**: ${verification.memoryAnalysis.secretRelatedMemories}
- **Verification Time**: ${verification.memoryAnalysis.verificationTimestamp.toISOString()}

## 💰 Cost Analysis
${costAnalysis}

## 🎯 Verification Conclusion

${
  verification.isComplete
    ? '✅ **SECRET EXCHANGE COMPLETE**: All expected secrets have been received and verified in memory.'
    : '⏳ **SECRET EXCHANGE INCOMPLETE**: Some secrets are still missing. Continue monitoring for incoming messages.'
}

${
  verification.mySecretShared
    ? '✅ **MY SECRET SHARED**: This agent has successfully shared its secret with others.'
    : '❌ **MY SECRET NOT SHARED**: This agent has not yet shared its secret.'
}

---
*Verification completed from ${agentId} perspective*`;

  return report;
}

// Types for verification
interface SecretVerificationResult {
  agentId: string;
  expectedSecrets: string[];
  receivedSecrets: ReceivedSecret[];
  mySecretShared: boolean;
  isComplete: boolean;
  memoryAnalysis: {
    totalMemories: number;
    secretRelatedMemories: number;
    verificationTimestamp: Date;
  };
}

interface ReceivedSecret {
  fromAgent: string;
  secretId: string;
  secretMessage: string;
  receivedAt: Date;
  memoryId: string;
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'CORRUPTED';
}
