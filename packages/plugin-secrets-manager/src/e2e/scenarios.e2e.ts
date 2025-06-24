import type { IAgentRuntime, UUID, TestCase, TestSuite, World } from '@elizaos/core';
import { Role } from '@elizaos/core';
import { EnhancedSecretManager } from '../enhanced-service';

// Helper to generate a UUID
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const scenarios: TestCase[] = [
  {
    name: 'Scenario 1: Standard User - Good Case API Key Storage',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const alexId = uuidv4() as UUID;

      const context = {
        level: 'user' as const,
        userId: alexId,
        requesterId: alexId,
        agentId: _runtime.agentId,
      };

      // Simulate user setting a secret
      await secret.set('OPENAI_API_KEY', 'sk-abc123xyz', context);

      // Verify the secret is stored
      const retrieved = await secret.get('OPENAI_API_KEY', context);

      if (retrieved !== 'sk-abc123xyz') {
        throw new Error(`Expected secret 'sk-abc123xyz', but got '${retrieved || 'null'}'`);
      }
    },
  },
  {
    name: 'Scenario 2: Admin - World-Level Secret Configuration',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const adminId = uuidv4() as UUID;
      const worldId = uuidv4() as UUID;

      // Create a mock world
      const _world: World = {
        id: worldId,
        agentId: _runtime.agentId,
        serverId: 'discord-main-server',
        metadata: {
          roles: { [adminId]: Role.ADMIN },
        },
      };
      await _runtime.ensureWorldExists(_world);

      const context = {
        level: 'world' as const,
        worldId,
        requesterId: adminId,
        agentId: _runtime.agentId,
      };

      await secret.set('GOOGLE_API_KEY', 'g-key-9876', context);

      const retrieved = await secret.get('GOOGLE_API_KEY', context);
      if (retrieved !== 'g-key-9876') {
        throw new Error(`Expected world secret 'g-key-9876', but got '${retrieved || 'null'}'`);
      }
    },
  },
  {
    name: 'Scenario 3: Anonymous User - Bad Case Attempted Access',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const alexId = uuidv4() as UUID;
      const anonymousId = uuidv4() as UUID;

      // Set a secret for Alex first
      await secret.set('OPENAI_API_KEY', 'sk-abc123xyz', {
        level: 'user',
        userId: alexId,
        requesterId: alexId,
        agentId: _runtime.agentId,
      });

      // Anonymous user tries to get it
      const retrieved = await secret.get('OPENAI_API_KEY', {
        level: 'user',
        userId: alexId,
        requesterId: anonymousId,
        agentId: _runtime.agentId,
      });

      if (retrieved !== null) {
        throw new Error('Expected secret to be null, but got a value.');
      }
    },
  },
  {
    name: 'Scenario 4: User - Prompt Injection Attack',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const alexId = uuidv4() as UUID;
      const malloryId = uuidv4() as UUID;

      await secret.set('ALEX_SECRET', 'secret-value', {
        level: 'user',
        userId: alexId,
        requesterId: alexId,
        agentId: _runtime.agentId,
      });

      // Mallory tries to get Alex's secret
      const retrieved = await secret.get('ALEX_SECRET', {
        level: 'user',
        userId: alexId, // Mallory is asking for Alex's secret
        requesterId: malloryId, // but she is the requester
        agentId: _runtime.agentId,
      });

      if (retrieved !== null) {
        throw new Error('Prompt injection attack succeeded, secret was retrieved.');
      }
    },
  },
  {
    name: 'Scenario 5: User - Asking for Help / Discovery',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const neoId = uuidv4() as UUID;

      // Get the list of secrets for a new user
      const secrets = await secret.list({
        level: 'user',
        userId: neoId,
        requesterId: neoId,
        agentId: _runtime.agentId,
      });

      if (Object.keys(secrets).length !== 0) {
        throw new Error('Expected new user to have no secrets.');
      }
    },
  },
  {
    name: 'Scenario 6: Admin - Revoking Access',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const adminId = uuidv4() as UUID;
      const malloryId = uuidv4() as UUID;
      const worldId = uuidv4() as UUID;
      const _world: World = {
        id: worldId,
        agentId: _runtime.agentId,
        serverId: 'discord-main-server',
        metadata: {
          roles: {
            [adminId]: Role.ADMIN,
          },
        },
      };
      await _runtime.ensureWorldExists(_world);

      const worldContext = { level: 'world' as const, worldId, agentId: _runtime.agentId };

      // Admin sets a secret and grants Mallory access
      await secret.set('SHARED_SECRET', 'world-secret', {
        ...worldContext,
        requesterId: adminId,
      });
      await secret.grantAccess(
        'SHARED_SECRET',
        { ...worldContext, requesterId: adminId },
        malloryId,
        ['read']
      );

      // Verify Mallory has access
      let retrieved = await secret.get('SHARED_SECRET', {
        ...worldContext,
        requesterId: malloryId,
      });
      if (retrieved !== 'world-secret') {
        throw new Error('Mallory should have had access before revoke.');
      }

      // Admin revokes access
      await secret.revokeAccess(
        'SHARED_SECRET',
        { ...worldContext, requesterId: adminId },
        malloryId
      );

      // Verify Mallory no longer has access
      retrieved = await secret.get('SHARED_SECRET', {
        ...worldContext,
        requesterId: malloryId,
      });
      if (retrieved !== null) {
        throw new Error('Mallory should not have access after revoke.');
      }
    },
  },
  {
    name: 'Scenario 7: User - Incorrect Secret Value (Validation Fail)',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const alexId = uuidv4() as UUID;
      const context = {
        level: 'user' as const,
        userId: alexId,
        requesterId: alexId,
        agentId: _runtime.agentId,
      };

      // Set a value that will fail the built-in regex for AWS keys
      const result = await secret.set('AWS_ACCESS_KEY_ID', 'AKIA-INVALID', context, {
        validationMethod: 'aws_access_key_id',
      });

      if (result === true) {
        throw new Error('Set operation should have failed validation but it succeeded.');
      }

      const secretValue = await secret.get('AWS_ACCESS_KEY_ID', context);
      if (secretValue !== null) {
        throw new Error('Invalid secret should not have been stored.');
      }
    },
  },
  {
    name: 'Scenario 8: User - Updating an Existing Secret',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const alexId = uuidv4() as UUID;
      const context = {
        level: 'user' as const,
        userId: alexId,
        requesterId: alexId,
        agentId: _runtime.agentId,
      };

      // Set initial secret
      await secret.set('OPENAI_API_KEY', 'sk-old-key', context);
      let retrieved = await secret.get('OPENAI_API_KEY', context);
      if (retrieved !== 'sk-old-key') {
        throw new Error('Initial set failed.');
      }

      // Update secret
      await secret.set('OPENAI_API_KEY', 'sk-new-key', context);
      retrieved = await secret.get('OPENAI_API_KEY', context);
      if (retrieved !== 'sk-new-key') {
        throw new Error('Update failed.');
      }
    },
  },
  {
    name: 'Scenario 9: System - Automated Secret Generation',
    fn: async (_runtime: IAgentRuntime) => {
      // This scenario is harder to test in isolation as it relies on the env manager service
      // and plugin lifecycle. We will test the core logic: generating and storing a secret.
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const context = {
        level: 'global' as const,
        agentId: _runtime.agentId,
        requesterId: _runtime.agentId,
      };

      // This would normally be called by another action like GENERATE_ENV_VAR
      const generatedSecret = 'a-secure-randomly-generated-value';
      await secret.set('JWT_SIGNING_SECRET', generatedSecret, context);

      const retrieved = await secret.get('JWT_SIGNING_SECRET', context);
      if (retrieved !== generatedSecret) {
        throw new Error('Automated secret generation and storage failed.');
      }
    },
  },
  {
    name: 'Scenario 10: Attacker - Trying to Overwrite World Secret',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = _runtime.getService<EnhancedSecretManager>('SECRETS');
      if (!secret) {
        throw new Error('SECRETS service not available');
      }
      const adminId = uuidv4() as UUID;
      const malloryId = uuidv4() as UUID;
      const worldId = uuidv4() as UUID;
      const _world: World = {
        id: worldId,
        agentId: _runtime.agentId,
        serverId: 'discord-main-server',
        metadata: { roles: { [adminId]: Role.ADMIN } },
      };
      await _runtime.ensureWorldExists(_world);

      const worldContext = {
        level: 'world' as const,
        worldId,
        agentId: _runtime.agentId,
        requesterId: adminId,
      };
      const malloryContext = {
        level: 'user' as const,
        userId: malloryId,
        agentId: _runtime.agentId,
        requesterId: malloryId,
      };

      // Admin sets world secret
      await secret.set('GOOGLE_API_KEY', 'g-key-world', worldContext);

      // Mallory sets a user-level secret with the same key
      await secret.set('GOOGLE_API_KEY', 'g-key-mallory', malloryContext);

      // Verify the world secret was not overwritten
      const retrievedWorld = await secret.get('GOOGLE_API_KEY', worldContext);
      if (retrievedWorld !== 'g-key-world') {
        throw new Error('World secret was overwritten by user secret.');
      }

      // Verify Mallory's secret exists at the user level
      const retrievedUser = await secret.get('GOOGLE_API_KEY', malloryContext);
      if (retrievedUser !== 'g-key-mallory') {
        throw new Error('User secret was not stored correctly.');
      }
    },
  },
];

export const secretsScenariosSuite: TestSuite = {
  name: 'Secrets Management Scenarios',
  tests: scenarios,
};
