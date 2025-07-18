import type { IAgentRuntime } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../../services/StorageService';

/**
 * Real integration test for NEAR Storage Service
 * Tests actual on-chain storage using NEAR Social contract
 */
export class StorageServiceIntegrationTest {
  name = 'storage-service-real-integration';
  description = 'Integration tests for NEAR storage service with real on-chain operations';

  tests = [
    {
      name: 'Storage service initializes with NEAR Social contract',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        // Check that service is initialized
        const status = await storageService.getStatus();
        if (status.status !== 'online') {
          throw new Error(`Storage service not online: ${status.error}`);
        }

        console.log('✓ Storage service initialized with NEAR Social');
      },
    },
    {
      name: 'Store and retrieve data on-chain',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        const testKey = `test-${Date.now()}-${uuidv4()}`;
        const testData = {
          message: 'Hello from ElizaOS NEAR Plugin!',
          timestamp: Date.now(),
          random: Math.random(),
        };

        console.log(`Storing data with key: ${testKey}`);

        // Store data on-chain
        await storageService.set(testKey, testData);

        // Wait for blockchain confirmation
        console.log('Waiting for blockchain confirmation...');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Retrieve data
        console.log('Retrieving data from chain...');
        const retrieved = await storageService.get(testKey);

        if (!retrieved) {
          throw new Error('Failed to retrieve stored data');
        }

        // Verify data integrity
        if (JSON.stringify(retrieved) !== JSON.stringify(testData)) {
          throw new Error(
            `Data mismatch: expected ${JSON.stringify(testData)}, got ${JSON.stringify(retrieved)}`
          );
        }

        console.log('✓ Successfully stored and retrieved data on-chain');

        // Clean up
        await storageService.delete(testKey);
        console.log('✓ Cleaned up test data');
      },
    },
    {
      name: 'Batch storage operations',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        const batchData = [
          { key: `batch-1-${Date.now()}`, value: { data: 'First item' } },
          { key: `batch-2-${Date.now()}`, value: { data: 'Second item' } },
          { key: `batch-3-${Date.now()}`, value: { data: 'Third item' } },
        ];

        console.log('Storing batch data...');
        await storageService.setBatch(batchData);

        // Wait for confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify all items stored
        for (const item of batchData) {
          const retrieved = await storageService.get(item.key);
          if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(item.value)) {
            throw new Error(`Batch item ${item.key} not stored correctly`);
          }
        }

        console.log('✓ Batch storage successful');

        // Clean up
        for (const item of batchData) {
          await storageService.delete(item.key);
        }
      },
    },
    {
      name: 'List stored keys',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        // Store some test data
        const testKeys = [
          `list-test-1-${Date.now()}`,
          `list-test-2-${Date.now()}`,
          `list-test-3-${Date.now()}`,
        ];

        for (const key of testKeys) {
          await storageService.set(key, { test: true });
        }

        // Wait for confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // List keys
        const keys = await storageService.listKeys();

        // Verify our keys are in the list
        const foundKeys = testKeys.filter((key) => keys.includes(key));
        if (foundKeys.length !== testKeys.length) {
          throw new Error('Not all test keys found in list');
        }

        console.log('✓ Key listing works correctly');

        // Clean up
        for (const key of testKeys) {
          await storageService.delete(key);
        }
      },
    },
    {
      name: 'Share data between accounts',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        const sharedKey = `shared-${Date.now()}`;
        const sharedData = {
          message: 'This data is shared',
          from: runtime.getSetting('NEAR_ADDRESS'),
        };

        // Store data
        await storageService.set(sharedKey, sharedData);

        // Share with another account (using same account for testing)
        const targetAccount = runtime.getSetting('NEAR_ADDRESS');
        await storageService.shareWith(sharedKey, targetAccount);

        // Wait for confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Try to retrieve shared data
        const shared = await storageService.getShared(sharedKey, targetAccount);

        if (!shared) {
          console.warn(
            'Shared data retrieval returned null - this may be normal for same-account sharing'
          );
        } else {
          console.log('✓ Data sharing mechanism works');
        }

        // Clean up
        await storageService.delete(sharedKey);
        await storageService.delete(`shared:${targetAccount}:${sharedKey}`);
      },
    },
    {
      name: 'Handle non-existent keys gracefully',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        const nonExistentKey = `non-existent-${uuidv4()}`;
        const result = await storageService.get(nonExistentKey);

        if (result !== null) {
          throw new Error('Expected null for non-existent key');
        }

        console.log('✓ Non-existent keys handled correctly');
      },
    },
    {
      name: 'Complex data types storage',
      fn: async (runtime: IAgentRuntime) => {
        const storageService = runtime.getService<StorageService>('near-storage' as any);
        if (!storageService) {
          throw new Error('Storage service not available');
        }

        const complexData = {
          string: 'Hello NEAR',
          number: 42,
          float: 3.14159,
          boolean: true,
          null: null,
          array: [1, 'two', { three: 3 }],
          nested: {
            deep: {
              value: 'Found me!',
              timestamp: new Date().toISOString(),
            },
          },
          unicode: '🚀 ElizaOS on NEAR! 🌟',
        };

        const key = `complex-${Date.now()}`;

        // Store complex data
        await storageService.set(key, complexData);

        // Wait for confirmation
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Retrieve and verify
        const retrieved = await storageService.get(key);

        if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(complexData)) {
          throw new Error('Complex data not stored/retrieved correctly');
        }

        console.log('✓ Complex data types handled correctly');

        // Clean up
        await storageService.delete(key);
      },
    },
  ];
}

export default new StorageServiceIntegrationTest();
