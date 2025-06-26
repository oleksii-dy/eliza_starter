import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type State,
  logger,
} from '@elizaos/core';

/**
 * Secret Message Provider
 * Each agent has a unique secret message they need to share with others
 * This provider supplies the secret and tracks sharing status
 */
export const secretMessageProvider: Provider = {
  name: 'SECRET_MESSAGE',
  description: "Provides agent's secret message and tracks sharing status",
  position: 5, // Execute after basic providers

  async get(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<ProviderResult> {
    try {
      logger.info('Retrieving secret message for agent', { agentId: runtime.agentId });

      // Get agent-specific secret messages
      const secrets = getAgentSecrets();
      const agentSecret = secrets[runtime.agentId] || secrets['default'];

      // Check if secret has been shared
      const hasShared = await checkIfSecretShared(runtime, agentSecret.message);

      // Get received secrets from other agents
      const receivedSecrets = await getReceivedSecrets(runtime);

      // Calculate sharing progress
      const totalAgents = Object.keys(secrets).length - 1; // Exclude 'default'
      const secretsReceived = receivedSecrets.length;
      const sharingProgress = secretsReceived / totalAgents;

      const result: ProviderResult = {
        values: {
          secretMessage: agentSecret.message,
          secretId: agentSecret.id,
          hasShared,
          receivedSecrets,
          sharingProgress,
          sharingStatus: getSharingStatus(hasShared, secretsReceived, totalAgents),
        },
        data: {
          agentSecret,
          receivedCount: secretsReceived,
          totalAgents,
          needsToShare: !hasShared,
          allSecretsReceived: secretsReceived === totalAgents,
        },
        text: `Agent Secret Status:
- My Secret: "${agentSecret.message}" (${hasShared ? 'SHARED' : 'NOT SHARED'})
- Secrets Received: ${secretsReceived}/${totalAgents}
- Progress: ${(sharingProgress * 100).toFixed(1)}%
- Status: ${getSharingStatus(hasShared, secretsReceived, totalAgents)}`,
      };

      logger.info('Secret message provider result', {
        agentId: runtime.agentId,
        hasShared,
        secretsReceived,
        progress: sharingProgress,
      });

      return result;
    } catch (error) {
      logger.error('Error in secret message provider:', error);
      return {
        values: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        text: 'Error retrieving secret message information',
      };
    }
  },
};

/**
 * Get agent-specific secret messages
 */
function getAgentSecrets(): { [agentId: string]: { id: string; message: string; cost: number } } {
  return {
    // Alice's secret (financial intelligence)
    'alice-agent': {
      id: 'alice-secret-001',
      message: 'The quantum encryption key for the treasury is: QE-7749-ALPHA-MIDNIGHT',
      cost: 0.05, // MIDNIGHT tokens
    },

    // Bob's secret (technical intelligence)
    'bob-agent': {
      id: 'bob-secret-002',
      message: 'The zero-knowledge proof circuit optimization code is: ZK-COMPACT-9821-BETA',
      cost: 0.03, // MIDNIGHT tokens
    },

    // Charlie's secret (network intelligence)
    'charlie-agent': {
      id: 'charlie-secret-003',
      message: 'The network consensus override protocol is: CONSENSUS-OVERRIDE-4433-GAMMA',
      cost: 0.04, // MIDNIGHT tokens
    },

    // Default for test agents
    default: {
      id: 'test-secret-000',
      message: 'The test verification code is: TEST-VERIFY-1234-DELTA',
      cost: 0.01, // MIDNIGHT tokens
    },
  };
}

/**
 * Check if the agent has already shared their secret
 */
async function checkIfSecretShared(
  runtime: IAgentRuntime,
  secretMessage: string
): Promise<boolean> {
  try {
    // Search for memories containing the secret message
    const memories = await runtime.getMemories({
      roomId: runtime.agentId,
      count: 100,
      tableName: 'memories',
    });

    // Check if any memory contains this agent sharing their secret
    const sharedSecret = memories.find(
      (memory) =>
        memory.content.text?.includes(secretMessage) &&
        memory.content.text?.includes('secret') &&
        memory.agentId === runtime.agentId
    );

    return !!sharedSecret;
  } catch (error) {
    logger.error('Error checking if secret shared:', error);
    return false;
  }
}

/**
 * Get secrets received from other agents
 */
async function getReceivedSecrets(
  runtime: IAgentRuntime
): Promise<Array<{ agentId: string; secret: string; timestamp: Date }>> {
  try {
    const receivedSecrets: Array<{ agentId: string; secret: string; timestamp: Date }> = [];

    // Get all memories from conversations
    const memories = await runtime.getMemories({
      roomId: runtime.agentId,
      count: 200,
      tableName: 'memories',
    });

    const allSecrets = getAgentSecrets();

    // Check for each possible secret from other agents
    for (const [agentId, secretData] of Object.entries(allSecrets)) {
      if (agentId === runtime.agentId || agentId === 'default') {
        continue;
      }

      // Look for memories containing this agent's secret
      const receivedMemory = memories.find(
        (memory) =>
          memory.content.text?.includes(secretData.message) && memory.agentId !== runtime.agentId // From another agent
      );

      if (receivedMemory) {
        receivedSecrets.push({
          agentId,
          secret: secretData.message,
          timestamp: new Date(receivedMemory.createdAt || Date.now()),
        });
      }
    }

    // Sort by timestamp (oldest first)
    receivedSecrets.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return receivedSecrets;
  } catch (error) {
    logger.error('Error getting received secrets:', error);
    return [];
  }
}

/**
 * Get sharing status description
 */
function getSharingStatus(hasShared: boolean, receivedCount: number, totalAgents: number): string {
  if (!hasShared && receivedCount === 0) {
    return 'WAITING TO START - Need to share my secret';
  } else if (!hasShared && receivedCount > 0) {
    return 'RECEIVING SECRETS - Need to share my secret';
  } else if (hasShared && receivedCount < totalAgents) {
    return 'SHARED SECRET - Waiting for more secrets';
  } else if (hasShared && receivedCount === totalAgents) {
    return 'COMPLETE - All secrets exchanged';
  } else {
    return 'IN PROGRESS';
  }
}
