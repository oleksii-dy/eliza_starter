import type { IAgentRuntime, Memory, UUID, TestSuite, TestCase } from '@elizaos/core';
import { manageSecretAction } from '../actions/manageSecret';
import { requestSecretFormAction } from '../actions/requestSecretForm';
import { runWorkflowAction } from '../actions/runWorkflow';
import { uxGuidanceProvider } from '../providers/uxGuidanceProvider';
import { ActionChainService } from '../services/action-chain-service';

// Define the UX guidance response type locally
interface UXGuidanceResponse {
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  quickActions: Array<{
    actionName: string;
    title: string;
    description: string;
  }>;
  statusSummary: {
    totalSecrets: number;
    missingSecrets: number;
    healthStatus: string;
  };
  contextualHelp: {
    currentContext: string;
    troubleshooting: Array<{
      issue: string;
      solution: string;
    }>;
  };
}

/**
 * Runtime-based UX flow tests
 * These tests use real runtime instances and services
 */
export class UXFlowTestSuite implements TestSuite {
  name = 'ux-flow-runtime-tests';
  description = 'Runtime integration tests for UX guidance and workflows';

  tests: TestCase[] = [
    {
      name: 'Should guide new users through secret setup',
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          id: 'test-ux-1' as UUID,
          agentId: runtime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: 'I need help setting up my API keys',
            source: 'user',
          },
          createdAt: Date.now(),
        };

        // Get UX guidance
        const result = await uxGuidanceProvider.get(runtime, message, {
          values: {},
          data: {},
          text: '',
        });
        const guidance = result.data as UXGuidanceResponse;

        if (!guidance) {
          throw new Error('No UX guidance returned');
        }

        // Verify new user suggestions
        const setupSuggestion = guidance.suggestions.find((s) => s.type === 'setup');
        if (!setupSuggestion) {
          throw new Error('No setup suggestion found for new user');
        }

        if (!setupSuggestion.title.includes('Welcome')) {
          throw new Error('Setup suggestion does not welcome new user');
        }

        // Verify quick actions
        const addSecretAction = guidance.quickActions.find(
          (a) => a.actionName === 'REQUEST_SECRET_FORM'
        );
        if (!addSecretAction) {
          throw new Error('No add secret quick action found');
        }

        // Verify status
        if (guidance.statusSummary.totalSecrets !== 0) {
          throw new Error(`Expected 0 secrets, got ${guidance.statusSummary.totalSecrets}`);
        }

        console.log('✓ New user guidance working correctly');
      },
    },

    {
      name: 'Should execute user onboarding workflow',
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          id: 'test-ux-2' as UUID,
          agentId: runtime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: 'Run the user onboarding workflow',
            source: 'user',
          },
          createdAt: Date.now(),
        };

        let callbackCalled = false;
        const callback = async (_result: any) => {
          callbackCalled = true;
          return [];
        };

        // Execute workflow action
        const success = await runWorkflowAction.handler(
          runtime,
          message,
          { values: {}, data: {}, text: '' },
          {},
          callback
        );

        if (!success) {
          throw new Error('Workflow execution failed');
        }

        if (!callbackCalled) {
          throw new Error('Callback was not called');
        }

        console.log('✓ User onboarding workflow executed successfully');
      },
    },

    {
      name: 'Should validate secret form action',
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          id: 'test-ux-3' as UUID,
          agentId: runtime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: 'I need to add my OpenAI API key',
            source: 'user',
          },
          createdAt: Date.now(),
        };

        // Test validation
        const isValid = await requestSecretFormAction.validate(runtime, message);

        // The action should be valid if secret form service is available
        const formService = runtime.getService('SECRET_FORMS');
        if (formService && !isValid) {
          throw new Error('Secret form action validation failed when service is available');
        }

        if (!formService && isValid) {
          throw new Error('Secret form action validation passed when service is not available');
        }

        console.log('✓ Secret form action validation working correctly');
      },
    },

    {
      name: 'Should handle secret listing',
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          id: 'test-ux-4' as UUID,
          agentId: runtime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: JSON.stringify({
              operation: 'list',
              level: 'user',
            }),
            source: 'user',
          },
          createdAt: Date.now(),
        };

        let callbackResult: any = null;
        const callback = async (result: any) => {
          callbackResult = result;
          return [];
        };

        const success = await manageSecretAction.handler(
          runtime,
          message,
          { values: {}, data: {}, text: '' },
          {},
          callback
        );

        if (!success) {
          throw new Error('Secret listing failed');
        }

        if (!callbackResult) {
          throw new Error('No callback result received');
        }

        // Should mention no secrets or list existing secrets
        if (!callbackResult.text.includes('secret')) {
          throw new Error('Response does not mention secrets');
        }

        console.log('✓ Secret listing working correctly');
      },
    },

    {
      name: 'Should provide contextual help based on user message',
      fn: async (runtime: IAgentRuntime) => {
        const testCases = [
          {
            text: 'I have an API key error',
            expectedContext: 'api-keys',
          },
          {
            text: 'How do workflows work?',
            expectedContext: 'workflows',
          },
          {
            text: 'I need help with secrets',
            expectedContext: 'secrets',
          },
          {
            text: 'Something is broken',
            expectedContext: 'troubleshooting',
          },
        ];

        for (const testCase of testCases) {
          const message: Memory = {
            id: 'test-context' as UUID,
            agentId: runtime.agentId,
            entityId: 'user-123' as UUID,
            roomId: 'room-123' as UUID,
            content: {
              text: testCase.text,
              source: 'user',
            },
            createdAt: Date.now(),
          };

          const result = await uxGuidanceProvider.get(runtime, message, {
            values: {},
            data: {},
            text: '',
          });
          const guidance = result.data as UXGuidanceResponse;

          if (guidance.contextualHelp.currentContext !== testCase.expectedContext) {
            throw new Error(
              `Expected context ${testCase.expectedContext}, got ${guidance.contextualHelp.currentContext}`
            );
          }
        }

        console.log('✓ Contextual help detection working correctly');
      },
    },

    {
      name: 'Should handle service unavailability gracefully',
      fn: async (runtime: IAgentRuntime) => {
        // Create a message when services might not be available
        const message: Memory = {
          id: 'test-ux-5' as UUID,
          agentId: runtime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: 'Help me with secrets',
            source: 'user',
          },
          createdAt: Date.now(),
        };

        // Temporarily remove services
        const originalGetService = runtime.getService;
        (runtime as any).getService = () => null;

        try {
          const result = await uxGuidanceProvider.get(runtime, message, {
            values: {},
            data: {},
            text: '',
          });
          const guidance = result.data as UXGuidanceResponse;

          // Should provide troubleshooting suggestions
          const troubleshootingSuggestion = guidance.suggestions.find(
            (s) => s.type === 'troubleshooting'
          );
          if (!troubleshootingSuggestion) {
            throw new Error('No troubleshooting suggestion when services unavailable');
          }

          // Should have troubleshooting help
          const serviceIssue = guidance.contextualHelp.troubleshooting.find(
            (t) => t.issue === 'Service unavailable'
          );
          if (!serviceIssue) {
            throw new Error('No service unavailable troubleshooting help');
          }

          console.log('✓ Service unavailability handled gracefully');
        } finally {
          // Restore original service getter
          (runtime as any).getService = originalGetService;
        }
      },
    },

    {
      name: 'Should verify workflow chain integration',
      fn: async (runtime: IAgentRuntime) => {
        const actionChainService = runtime.getService('ACTION_CHAIN') as ActionChainService;
        if (!actionChainService) {
          console.log('⚠️ Skipping workflow chain test - ActionChainService not available');
          return;
        }

        const workflows = actionChainService.getWorkflows();
        if (workflows.length === 0) {
          throw new Error('No workflows found');
        }

        const onboardingWorkflow = workflows.find((w) => w.id === 'user-secret-onboarding');
        if (!onboardingWorkflow) {
          throw new Error('User onboarding workflow not found');
        }

        if (!onboardingWorkflow.steps || onboardingWorkflow.steps.length === 0) {
          throw new Error('Onboarding workflow has no steps');
        }

        console.log('✓ Workflow chain integration verified');
      },
    },
  ];
}

// Export test suite instance
export default new UXFlowTestSuite();
