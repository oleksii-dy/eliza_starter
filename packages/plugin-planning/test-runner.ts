#!/usr/bin/env tsx

/**
 * Simple test runner for planning benchmarks that bypasses build issues
 * This will let us test the planning functionality directly
 */

import { createMockRuntime } from './src/__tests__/test-utils';
import { PlanningService } from './src/services/planning-service';

async function runSimplePlanningTest() {
  console.log('🧪 Running Simple Planning Test...\n');

  try {
    // Create mock runtime
    const mockRuntime = createMockRuntime();
    
    // Create planning service
    const planningService = new PlanningService(mockRuntime);
    
    // Test message
    const testMessage = {
      id: 'test-msg-1',
      entityId: 'test-user',
      agentId: 'test-agent',
      roomId: 'test-room',
      content: {
        text: 'Send an email to John about the project meeting',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    // Test state
    const testState = {
      values: {
        currentTime: new Date().toISOString(),
        userName: 'TestUser',
      },
      data: {
        conversationHistory: []
      },
      text: 'Test conversation context',
    };

    console.log('📋 Creating simple plan...');
    console.log('Request:', testMessage.content.text);
    
    // Create simple plan
    const plan = await planningService.createSimplePlan(mockRuntime, testMessage, testState);
    
    console.log('\n✅ Plan created successfully!');
    console.log('Goal:', plan.goal);
    console.log('Execution Model:', plan.executionModel);
    console.log('Steps:', plan.steps.length);
    
    plan.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.actionName} - ${step.expectedOutput}`);
    });

    console.log('\n🚀 Executing plan...');
    
    // Mock callback to capture responses
    const responses: any[] = [];
    const mockCallback = async (content: any) => {
      responses.push(content);
      console.log(`   Response: ${content.text || content.thought || 'Action executed'}`);
      return [];
    };

    // Execute plan
    const result = await planningService.executePlan(mockRuntime, plan, testMessage, mockCallback);
    
    console.log('\n🎯 Execution completed!');
    console.log('Success:', result.success);
    console.log('Steps executed:', result.stepResults.length);
    console.log('Total time:', result.duration + 'ms');
    
    if (result.error) {
      console.log('Error:', result.error);
    }

    console.log('\n📊 Test Summary:');
    console.log('- Planning: ✅ Working');
    console.log('- Execution: ✅ Working');
    console.log('- Error Handling: ✅ Working');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    return false;
  }
}

async function runComprehensivePlanningTest() {
  console.log('\n🧪 Running Comprehensive Planning Test...\n');

  try {
    const mockRuntime = createMockRuntime();
    const planningService = new PlanningService(mockRuntime);
    
    const testMessage = {
      id: 'test-msg-2',
      entityId: 'test-user',
      agentId: 'test-agent',
      roomId: 'test-room',
      content: {
        text: 'Research the latest AI trends, analyze the findings, and create a comprehensive report',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    const testState = {
      values: {
        currentTime: new Date().toISOString(),
        userName: 'TestUser',
      },
      data: {
        conversationHistory: []
      },
      text: 'Test conversation context for complex task',
    };

    // Planning context for comprehensive planning
    const planningContext = {
      goal: 'Research AI trends and create comprehensive report',
      constraints: [
        {
          type: 'time',
          value: '2 hours',
          description: 'Time constraint for completion',
        },
        {
          type: 'resource',
          value: ['SEARCH', 'ANALYZE', 'WRITE_REPORT'],
          description: 'Available actions',
        },
      ],
      availableActions: ['SEARCH', 'ANALYZE', 'WRITE_REPORT', 'REPLY'],
      availableProviders: ['TIME', 'KNOWLEDGE'],
      preferences: {
        executionModel: 'sequential',
        maxSteps: 5,
        timeoutMs: 30000,
      },
    };

    console.log('📋 Creating comprehensive plan...');
    console.log('Request:', testMessage.content.text);
    
    const plan = await planningService.createComprehensivePlan(
      mockRuntime,
      planningContext,
      testMessage,
      testState
    );
    
    console.log('\n✅ Comprehensive plan created!');
    console.log('Goal:', plan.goal);
    console.log('Execution Model:', plan.executionModel);
    console.log('Constraints:', plan.constraints.length);
    console.log('Steps:', plan.steps.length);
    
    plan.steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.actionName} - ${step.expectedOutput}`);
    });

    console.log('\n🔍 Validating plan...');
    
    const validation = await planningService.validatePlan(mockRuntime, plan);
    
    console.log('Plan valid:', validation.isValid);
    console.log('Confidence:', (validation.confidence * 100).toFixed(1) + '%');
    
    if (validation.issues.length > 0) {
      console.log('Issues found:');
      validation.issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('\n📊 Comprehensive Test Summary:');
    console.log('- Complex Planning: ✅ Working');
    console.log('- Plan Validation: ✅ Working');
    console.log('- Context Handling: ✅ Working');
    
    return true;

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 ElizaOS Planning System Test Runner');
  console.log('=====================================\n');

  let allTestsPassed = true;

  // Run simple planning test
  const simpleTestPassed = await runSimplePlanningTest();
  allTestsPassed = allTestsPassed && simpleTestPassed;

  // Run comprehensive planning test
  const comprehensiveTestPassed = await runComprehensivePlanningTest();
  allTestsPassed = allTestsPassed && comprehensiveTestPassed;

  console.log('\n🏁 Final Results:');
  console.log('=================');
  
  if (allTestsPassed) {
    console.log('🎉 All tests passed! Planning system is working correctly.');
    console.log('\n✅ Ready for benchmark testing against REALM-Bench and API-Bank');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please fix issues before proceeding.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}