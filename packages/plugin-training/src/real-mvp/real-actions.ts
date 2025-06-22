/**
 * REAL MVP ACTIONS - ZERO LARP CODE
 * 
 * Actions based on validated real integration tests.
 * Every action has been tested with real ElizaOS runtime.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { getReasoningService } from './real-reasoning-service';

export const enableReasoningAction: Action = {
  name: 'ENABLE_REASONING',
  similes: ['ENABLE_CUSTOM_REASONING', 'START_REASONING'],
  description: 'Enable the custom reasoning service to collect training data',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // REAL: Check for enable-related keywords
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('enable') && 
           (text.includes('reasoning') || text.includes('training') || text.includes('custom'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const service = getReasoningService(runtime);
      
      if (service.isEnabled()) {
        await callback?.({
          text: 'Custom reasoning is already enabled.',
          thought: 'Service was already in enabled state',
        });
        return { text: 'Already enabled' };
      }

      // REAL: Enable the service
      await service.enable();

      await callback?.({
        text: 'Custom reasoning enabled. I will now collect training data from model interactions.',
        thought: 'Successfully enabled reasoning service with useModel override',
        actions: ['ENABLE_REASONING'],
      });

      return { text: 'Reasoning enabled successfully' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await callback?.({
        text: `Failed to enable custom reasoning: ${errorMessage}`,
        thought: 'Error occurred during reasoning service activation',
      });

      return { text: `Enable failed: ${errorMessage}` };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'enable custom reasoning' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Custom reasoning enabled. I will now collect training data from model interactions.',
          thought: 'Successfully enabled reasoning service with useModel override',
          actions: ['ENABLE_REASONING'],
        },
      },
    ],
  ],
};

export const disableReasoningAction: Action = {
  name: 'DISABLE_REASONING',
  similes: ['DISABLE_CUSTOM_REASONING', 'STOP_REASONING'],
  description: 'Disable the custom reasoning service and restore normal behavior',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // REAL: Check for disable-related keywords
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('disable') && 
           (text.includes('reasoning') || text.includes('training') || text.includes('custom'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const service = getReasoningService(runtime);
      
      if (!service.isEnabled()) {
        await callback?.({
          text: 'Custom reasoning is not currently enabled.',
          thought: 'Service was already in disabled state',
        });
        return { text: 'Already disabled' };
      }

      // REAL: Get training data summary before disabling
      const trainingData = service.getTrainingData();
      const dataCount = trainingData.length;

      // REAL: Disable the service
      await service.disable();

      await callback?.({
        text: `Custom reasoning disabled. Collected ${dataCount} training records during this session.`,
        thought: 'Successfully disabled reasoning service and restored original useModel',
        actions: ['DISABLE_REASONING'],
      });

      return { text: `Reasoning disabled, ${dataCount} records collected` };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await callback?.({
        text: `Failed to disable custom reasoning: ${errorMessage}`,
        thought: 'Error occurred during reasoning service deactivation',
      });

      return { text: `Disable failed: ${errorMessage}` };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'disable custom reasoning' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Custom reasoning disabled. Collected 5 training records during this session.',
          thought: 'Successfully disabled reasoning service and restored original useModel',
          actions: ['DISABLE_REASONING'],
        },
      },
    ],
  ],
};

export const checkReasoningStatusAction: Action = {
  name: 'CHECK_REASONING_STATUS',
  similes: ['REASONING_STATUS', 'CHECK_TRAINING_STATUS'],
  description: 'Check the current status of the reasoning service and training data',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // REAL: Check for status-related keywords
    const text = message.content.text?.toLowerCase() || '';
    return (text.includes('status') || text.includes('check')) && 
           (text.includes('reasoning') || text.includes('training') || text.includes('custom'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      const service = getReasoningService(runtime);
      const isEnabled = service.isEnabled();
      const trainingData = service.getTrainingData();
      const totalRecords = trainingData.length;
      const successfulRecords = trainingData.filter(r => r.success).length;
      const failedRecords = totalRecords - successfulRecords;

      const statusText = isEnabled ? 'enabled' : 'disabled';
      const statusDetail = isEnabled 
        ? `Currently collecting training data from model interactions.`
        : `Not currently collecting training data.`;

      await callback?.({
        text: `Custom reasoning is ${statusText}. ${statusDetail} Total records: ${totalRecords} (${successfulRecords} successful, ${failedRecords} failed).`,
        thought: `Service status: ${statusText}, data collection: ${totalRecords} records`,
        actions: ['CHECK_REASONING_STATUS'],
      });

      return { 
        text: `Status: ${statusText}`, 
        data: { enabled: isEnabled, totalRecords, successfulRecords, failedRecords }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await callback?.({
        text: `Failed to check reasoning status: ${errorMessage}`,
        thought: 'Error occurred during status check',
      });

      return { text: `Status check failed: ${errorMessage}` };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'check reasoning status' },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Custom reasoning is enabled. Currently collecting training data from model interactions. Total records: 3 (2 successful, 1 failed).',
          thought: 'Service status: enabled, data collection: 3 records',
          actions: ['CHECK_REASONING_STATUS'],
        },
      },
    ],
  ],
};

elizaLogger.info('✅ Real reasoning actions loaded');