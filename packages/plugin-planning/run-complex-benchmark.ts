#!/usr/bin/env tsx

/**
 * Run complex benchmark tests inspired by REALM-Bench and API-Bank
 * Tests more sophisticated planning scenarios
 */

import { planningPlugin } from './src/minimal-plugin';

interface ComplexBenchmarkCase {
  id: string;
  name: string;
  category: 'sequential' | 'parallel' | 'reactive' | 'multi-domain';
  description: string;
  userInput: string;
  expectedActions: string[];
  expectedOutputs: string[];
  minSteps: number;
  maxSteps: number;
  complexity: 'simple' | 'medium' | 'complex';
}

// Complex test cases inspired by REALM-Bench patterns
const complexBenchmarkCases: ComplexBenchmarkCase[] = [
  {
    id: 'realm-complex-001',
    name: 'Multi-Domain Research Project',
    category: 'sequential',
    description: 'Complex multi-step research and documentation task',
    userInput: 'I need to research the latest AI trends, analyze market data, create a comprehensive report, and then schedule a presentation meeting with stakeholders. Make sure to include competitive analysis and budget projections.',
    expectedActions: ['CREATE_PLAN', 'EXECUTE_PLAN'],
    expectedOutputs: ['plan created', 'research', 'analysis', 'report', 'meeting', 'execution completed'],
    minSteps: 5,
    maxSteps: 8,
    complexity: 'complex'
  },
  {
    id: 'realm-reactive-001', 
    name: 'Reactive Problem Solving',
    category: 'reactive',
    description: 'Task that requires adaptive planning based on conditions',
    userInput: 'Help me debug this production issue. First check the logs, then analyze the error patterns, and depending on what you find, either restart the services or escalate to the senior team.',
    expectedActions: ['CREATE_PLAN', 'EXECUTE_PLAN'],
    expectedOutputs: ['plan created', 'logs', 'analysis', 'execution completed'],
    minSteps: 3,
    maxSteps: 6,
    complexity: 'complex'
  },
  {
    id: 'api-bank-001',
    name: 'API Integration Planning',
    category: 'multi-domain',
    description: 'Complex API integration with multiple services',
    userInput: 'I need to integrate our system with three external APIs: payment processing, email notifications, and data analytics. Plan the integration steps, handle authentication, and create documentation.',
    expectedActions: ['CREATE_PLAN', 'EXECUTE_PLAN'],
    expectedOutputs: ['plan created', 'integration', 'authentication', 'documentation', 'execution completed'],
    minSteps: 4,
    maxSteps: 7,
    complexity: 'complex'
  }
];

// Enhanced mock runtime for complex scenarios
class ComplexMockRuntime {
  agentId = 'complex-planning-agent';
  logs: string[] = [];
  actions: string[] = [];
  responses: string[] = [];
  metrics: {
    startTime: number;
    endTime?: number;
    duration?: number;
    planComplexity?: string;
    stepCount?: number;
  };

  constructor() {
    this.metrics = { startTime: Date.now() };
  }

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

  finalize() {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
  }

  getReport() {
    return {
      actions: this.actions,
      responses: this.responses,
      metrics: this.metrics,
      totalLogs: this.logs.length
    };
  }
}

async function runComplexBenchmark(testCase: ComplexBenchmarkCase) {
  console.log(`\n🎯 Running Complex Benchmark: ${testCase.name}`);
  console.log('='.repeat(50));
  console.log(`📋 Category: ${testCase.category}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`🔤 User Input: "${testCase.userInput}"`);
  console.log(`⚡ Expected Complexity: ${testCase.complexity}`);
  console.log(`📊 Expected Steps: ${testCase.minSteps}-${testCase.maxSteps}`);
  console.log('');

  const runtime = new ComplexMockRuntime();

  try {
    // Step 1: Advanced message classification
    console.log('🧠 Step 1: Advanced Message Classification');
    console.log('------------------------------------------');
    
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
    runtime.log(`Classification: ${classificationResult.values?.messageClassification}`);
    runtime.log(`Complexity: ${classificationResult.values?.complexity}`);
    runtime.log(`Multi-step: ${classificationResult.values?.hasMultiStep}`);
    runtime.log(`Strategic: ${classificationResult.values?.hasStrategic}`);
    
    console.log('✅ Advanced classification completed');
    console.log('');

    // Step 2: Complex plan creation
    console.log('📋 Step 2: Complex Plan Creation');
    console.log('--------------------------------');
    
    const createPlanAction = planningPlugin.actions?.find(a => a.name === 'CREATE_PLAN');
    if (!createPlanAction) {
      throw new Error('CREATE_PLAN action not found');
    }

    const shouldCreatePlan = await createPlanAction.validate(runtime as any, mockMessage as any);
    console.log(`Plan creation validation: ${shouldCreatePlan ? '✅ Valid' : '❌ Invalid'}`);

    if (shouldCreatePlan) {
      const responses: string[] = [];
      const mockCallback = async (content: any) => {
        const response = content.text || content.thought || 'Response received';
        responses.push(response);
        runtime.recordResponse(response);
        console.log(`📤 Agent Response: ${response}`);
        return [];
      };

      const planResult = await createPlanAction.handler(
        runtime as any,
        mockMessage as any,
        classificationResult as any,
        {},
        mockCallback
      );

      runtime.recordAction('CREATE_PLAN');
      runtime.metrics.planComplexity = planResult.values?.plan?.complexity;
      runtime.metrics.stepCount = planResult.values?.plan?.steps?.length;
      
      console.log(`✅ Complex plan created with ${runtime.metrics.stepCount} steps`);
      console.log('');

      // Step 3: Complex plan execution  
      console.log('⚡ Step 3: Complex Plan Execution');
      console.log('---------------------------------');
      
      const executePlanAction = planningPlugin.actions?.find(a => a.name === 'EXECUTE_PLAN');
      if (executePlanAction) {
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
          console.log('✅ Complex plan executed successfully');
        }
      }
    }

    runtime.finalize();

    // Step 4: Advanced validation
    console.log('');
    console.log('📈 Step 4: Advanced Benchmark Validation');
    console.log('----------------------------------------');
    
    const actionMatches = testCase.expectedActions.filter(expected => 
      runtime.actions.includes(expected)
    );
    
    const outputMatches = testCase.expectedOutputs.filter(expected => {
      const expectedKeywords = expected.toLowerCase().split(' ');
      return runtime.responses.some(response => {
        const responseLower = response.toLowerCase();
        const matchingKeywords = expectedKeywords.filter(keyword => 
          responseLower.includes(keyword)
        );
        return matchingKeywords.length >= Math.ceil(expectedKeywords.length * 0.7);
      });
    });

    // Check step count
    const stepCountValid = runtime.metrics.stepCount && 
                          runtime.metrics.stepCount >= testCase.minSteps && 
                          runtime.metrics.stepCount <= testCase.maxSteps;

    console.log(`✅ Actions matched: ${actionMatches.length}/${testCase.expectedActions.length}`);
    console.log(`   Expected: ${testCase.expectedActions.join(', ')}`);
    console.log(`   Actual: ${runtime.actions.join(', ')}`);
    console.log('');
    
    console.log(`✅ Outputs matched: ${outputMatches.length}/${testCase.expectedOutputs.length}`);
    console.log(`   Expected keywords: ${testCase.expectedOutputs.join(', ')}`);
    console.log(`   Matched: ${outputMatches.join(', ')}`);
    console.log('');

    console.log(`✅ Step count: ${runtime.metrics.stepCount} (valid: ${stepCountValid ? 'Yes' : 'No'})`);
    console.log(`   Expected range: ${testCase.minSteps}-${testCase.maxSteps}`);
    console.log('');

    // Calculate comprehensive score
    const actionScore = actionMatches.length / testCase.expectedActions.length;
    const outputScore = outputMatches.length / testCase.expectedOutputs.length;
    const stepScore = stepCountValid ? 1.0 : 0.5;
    const overallScore = (actionScore + outputScore + stepScore) / 3;

    console.log('📊 Complex Benchmark Results:');
    console.log(`   Action Accuracy: ${(actionScore * 100).toFixed(1)}%`);
    console.log(`   Output Accuracy: ${(outputScore * 100).toFixed(1)}%`);
    console.log(`   Step Count Accuracy: ${(stepScore * 100).toFixed(1)}%`);
    console.log(`   Overall Score: ${(overallScore * 100).toFixed(1)}%`);
    console.log(`   Execution Time: ${runtime.metrics.duration}ms`);
    console.log(`   Plan Complexity: ${runtime.metrics.planComplexity}`);
    console.log('');

    if (overallScore >= 0.85) {
      console.log('🎉 COMPLEX BENCHMARK PASSED! Advanced planning working excellently.');
    } else if (overallScore >= 0.7) {
      console.log('✅ COMPLEX BENCHMARK PARTIAL PASS. Good performance with room for improvement.');
    } else {
      console.log('⚠️ COMPLEX BENCHMARK NEEDS WORK. Significant improvements needed.');
    }

    return {
      testCase: testCase.id,
      passed: overallScore >= 0.7,
      score: overallScore,
      report: runtime.getReport()
    };

  } catch (error) {
    console.error('❌ Complex benchmark failed with error:', error.message);
    runtime.finalize();
    
    return {
      testCase: testCase.id,
      passed: false,
      score: 0,
      error: error.message,
      report: runtime.getReport()
    };
  }
}

async function runAllComplexBenchmarks() {
  console.log('🚀 ElizaOS Complex Planning Benchmark Suite');
  console.log('===========================================\n');

  const results = [];
  
  for (const testCase of complexBenchmarkCases) {
    const result = await runComplexBenchmark(testCase);
    results.push(result);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary report
  console.log('\n📊 COMPLEX BENCHMARK SUITE SUMMARY');
  console.log('==================================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
  
  console.log(`✅ Tests Passed: ${passed}/${total} (${((passed/total) * 100).toFixed(1)}%)`);
  console.log(`📊 Average Score: ${(avgScore * 100).toFixed(1)}%`);
  console.log('');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testCase}: ${(result.score * 100).toFixed(1)}%`);
  });
  
  console.log('');
  
  if (passed === total && avgScore >= 0.8) {
    console.log('🎉 EXCELLENT! All complex benchmarks passed with high scores.');
    console.log('🚀 The planning system is ready for production use.');
  } else if (passed >= total * 0.7) {
    console.log('✅ GOOD! Most complex benchmarks passed.');
    console.log('🔧 Consider optimizing for better performance.');
  } else {
    console.log('⚠️ NEEDS IMPROVEMENT! Several benchmarks failed.');
    console.log('🛠️ Planning system requires significant enhancements.');
  }

  return passed === total && avgScore >= 0.7;
}

runAllComplexBenchmarks().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Suite failed:', error);
  process.exit(1);
});