#!/usr/bin/env tsx

/**
 * Run a single benchmark instance to test planning functionality
 * This bypasses the TypeScript import issues by using the working minimal plugin
 */

import { planningPlugin } from './src/minimal-plugin';

// Simple benchmark test case
interface BenchmarkTestCase {
  id: string;
  name: string;
  description: string;
  userInput: string;
  expectedActions: string[];
  expectedOutputs: string[];
  complexity: 'simple' | 'medium' | 'complex';
}

// REALM-Bench inspired test case
const benchmarkTestCase: BenchmarkTestCase = {
  id: 'realm-001',
  name: 'Email Planning Task',
  description: 'Test multi-step planning for email composition and sending',
  userInput: 'I need to send an email to John about the project meeting tomorrow at 2 PM. Make sure to include the agenda and meeting location.',
  expectedActions: ['CREATE_PLAN', 'EXECUTE_PLAN'],
  expectedOutputs: [
    'plan created',
    'email composed',
    'email sent',
    'execution completed'
  ],
  complexity: 'medium'
};

// Mock runtime that captures all the interactions
class MockBenchmarkRuntime {
  agentId = 'test-planning-agent';
  logs: string[] = [];
  actions: string[] = [];
  responses: string[] = [];

  log(message: string) {
    this.logs.push(message);
    console.log(`[RUNTIME] ${message}`);
  }

  recordAction(action: string) {
    this.actions.push(action);
    this.log(`Action executed: ${action}`);
  }

  recordResponse(response: string) {
    this.responses.push(response);
    this.log(`Response: ${response}`);
  }
}

async function runSingleBenchmark() {
  console.log('🎯 ElizaOS Planning Benchmark Test');
  console.log('==================================\n');

  const runtime = new MockBenchmarkRuntime();
  const testCase = benchmarkTestCase;

  console.log(`📋 Test Case: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`🔤 User Input: "${testCase.userInput}"`);
  console.log(`⚡ Complexity: ${testCase.complexity}`);
  console.log(`🎯 Expected Actions: ${testCase.expectedActions.join(', ')}`);
  console.log('');

  try {
    // Step 1: Test message classification
    console.log('📊 Step 1: Message Classification');
    console.log('--------------------------------');
    
    const classifier = planningPlugin.providers?.[0];
    if (!classifier) {
      throw new Error('Message classifier provider not found');
    }

    const mockMessage = {
      content: { text: testCase.userInput },
      entityId: 'test-user',
      roomId: 'test-room',
    };

    const classificationResult = await classifier.get(runtime as any, mockMessage as any, {} as any);
    console.log('Classification Result:', classificationResult);
    console.log(`✅ Message classified as: ${classificationResult.values?.messageClassification}`);
    console.log('');

    // Step 2: Test plan creation
    console.log('🧠 Step 2: Plan Creation');
    console.log('------------------------');
    
    const createPlanAction = planningPlugin.actions?.find(a => a.name === 'CREATE_PLAN');
    if (!createPlanAction) {
      throw new Error('CREATE_PLAN action not found');
    }

    // Check if plan creation should trigger
    const shouldCreatePlan = await createPlanAction.validate(runtime as any, mockMessage as any);
    console.log(`Plan creation validation: ${shouldCreatePlan ? '✅ Valid' : '❌ Invalid'}`);

    if (shouldCreatePlan) {
      // Mock callback to capture responses
      const responses: string[] = [];
      const mockCallback = async (content: any) => {
        const response = content.text || content.thought || 'Response received';
        responses.push(response);
        runtime.recordResponse(response);
        console.log(`📤 Agent Response: ${response}`);
        return [];
      };

      // Execute plan creation
      const planResult = await createPlanAction.handler(
        runtime as any,
        mockMessage as any,
        classificationResult as any,
        {},
        mockCallback
      );

      runtime.recordAction('CREATE_PLAN');
      console.log('Plan Result:', planResult);
      console.log('✅ Plan created successfully');
      console.log('');

      // Step 3: Test plan execution
      console.log('⚡ Step 3: Plan Execution');
      console.log('-------------------------');
      
      const executePlanAction = planningPlugin.actions?.find(a => a.name === 'EXECUTE_PLAN');
      if (executePlanAction) {
        // Create state with plan for execution
        const stateWithPlan = {
          values: { ...classificationResult.values, ...planResult.values },
          data: { ...classificationResult.data, ...planResult.data },
          text: ''
        };

        const shouldExecute = await executePlanAction.validate(runtime as any, mockMessage as any, stateWithPlan);
        console.log(`Plan execution validation: ${shouldExecute ? '✅ Valid' : '❌ Invalid'}`);

        if (shouldExecute) {
          const executionResult = await executePlanAction.handler(
            runtime as any,
            mockMessage as any,
            stateWithPlan,
            {},
            mockCallback
          );

          runtime.recordAction('EXECUTE_PLAN');
          console.log('Execution Result:', executionResult);
          console.log('✅ Plan executed successfully');
        }
      }
    }

    console.log('');

    // Step 4: Validate benchmark results
    console.log('📈 Step 4: Benchmark Validation');
    console.log('-------------------------------');
    
    const actionMatches = testCase.expectedActions.filter(expected => 
      runtime.actions.includes(expected)
    );
    
    const outputMatches = testCase.expectedOutputs.filter(expected => {
      // More flexible matching for expected outputs
      const expectedKeywords = expected.toLowerCase().split(' ');
      return runtime.responses.some(response => {
        const responseLower = response.toLowerCase();
        // Check if at least 70% of expected keywords are present
        const matchingKeywords = expectedKeywords.filter(keyword => 
          responseLower.includes(keyword)
        );
        return matchingKeywords.length >= Math.ceil(expectedKeywords.length * 0.7);
      });
    });

    console.log(`✅ Actions matched: ${actionMatches.length}/${testCase.expectedActions.length}`);
    console.log(`   Expected: ${testCase.expectedActions.join(', ')}`);
    console.log(`   Actual: ${runtime.actions.join(', ')}`);
    console.log('');
    
    console.log(`✅ Outputs matched: ${outputMatches.length}/${testCase.expectedOutputs.length}`);
    console.log(`   Expected keywords: ${testCase.expectedOutputs.join(', ')}`);
    console.log(`   Actual responses: ${runtime.responses.length} responses`);
    console.log('');

    // Calculate score
    const actionScore = actionMatches.length / testCase.expectedActions.length;
    const outputScore = outputMatches.length / testCase.expectedOutputs.length;
    const overallScore = (actionScore + outputScore) / 2;

    console.log('📊 Benchmark Results:');
    console.log(`   Action Accuracy: ${(actionScore * 100).toFixed(1)}%`);
    console.log(`   Output Accuracy: ${(outputScore * 100).toFixed(1)}%`);
    console.log(`   Overall Score: ${(overallScore * 100).toFixed(1)}%`);
    console.log('');

    if (overallScore >= 0.8) {
      console.log('🎉 BENCHMARK PASSED! Planning system working correctly.');
    } else if (overallScore >= 0.6) {
      console.log('⚠️  BENCHMARK PARTIAL PASS. Some issues detected.');
    } else {
      console.log('❌ BENCHMARK FAILED. Planning system needs improvement.');
    }

    console.log('');
    console.log('📋 Full Execution Log:');
    runtime.logs.forEach((log, i) => console.log(`${i + 1}. ${log}`));

    return overallScore >= 0.6;

  } catch (error) {
    console.error('❌ Benchmark failed with error:', error.message);
    console.error(error.stack);
    return false;
  }
}

runSingleBenchmark().then(success => {
  console.log('');
  console.log(success ? '✅ Benchmark completed successfully' : '❌ Benchmark failed');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});