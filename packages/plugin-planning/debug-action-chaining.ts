#!/usr/bin/env bun

/**
 * Debug Action Chaining - See exactly what's being passed between actions
 */

import { v4 as uuidv4 } from 'uuid';
import { planningPlugin } from './src/index';
import { PlanningService } from './src/services/planning-service';

class DebugTrackingRuntime {
  agentId: string;
  character: any;
  services: Map<string, any> = new Map();
  actions: any[] = [];
  providers: any[] = [];
  
  constructor() {
    this.agentId = uuidv4();
    this.character = {
      name: 'Debug Agent',
      bio: ['Debug agent'],
      system: 'Debug system'
    };
  }
  
  async useModel(modelType: string, params: any): Promise<string> {
    if (params.prompt?.includes('Analyze this user request and classify')) {
      return `COMPLEXITY: medium
PLANNING: sequential_planning
CAPABILITIES: project_management, coordination
STAKEHOLDERS: team_members
CONSTRAINTS: timeline
DEPENDENCIES: team_availability
CONFIDENCE: 0.8`;
    } else if (params.prompt?.includes('Create a detailed plan')) {
      return `<plan>
<goal>Debug action chaining</goal>
<execution_model>sequential</execution_model>
<steps>
<step>
<id>step_1</id>
<action>ANALYZE_INPUT</action>
<parameters>{"focus": "debug_test"}</parameters>
<dependencies>[]</dependencies>
<description>First step</description>
</step>
<step>
<id>step_2</id>
<action>PROCESS_ANALYSIS</action>
<parameters>{"type": "debug_processing"}</parameters>
<dependencies>["step_1"]</dependencies>
<description>Second step</description>
</step>
</steps>
<estimated_duration>60000</estimated_duration>
</plan>`;
    }
    return 'Mock response';
  }
  
  getService<T>(name: string): T | null {
    return this.services.get(name) as T || null;
  }
  
  registerService(service: any): void {
    this.services.set(service.serviceName, service);
  }
  
  async createMemory(): Promise<string> { return uuidv4(); }
  async getMemories(): Promise<any[]> { return []; }
  
  logger = {
    info: (msg: string) => console.log(`   ℹ️ ${msg}`),
    warn: (msg: string) => console.log(`   ⚠️ ${msg}`),
    error: (msg: string) => console.log(`   ❌ ${msg}`),
    debug: (msg: string) => console.log(`   🐛 ${msg}`)
  };
  
  getSetting(): any { return 'test-value'; }
}

async function debugActionChaining() {
  console.log('🔍 DEBUG: Action Chaining Analysis\n');
  
  const runtime = new DebugTrackingRuntime();
  
  // Initialize planning service
  const planningService = await PlanningService.start(runtime as any);
  runtime.registerService(planningService);
  
  // Register plugin components
  if (planningPlugin.actions) {
    runtime.actions.push(...planningPlugin.actions);
  }
  if (planningPlugin.providers) {
    runtime.providers.push(...planningPlugin.providers);
  }
  
  console.log('🎯 Creating simple 2-step plan for debugging...\n');
  
  const testMessage = {
    id: uuidv4(),
    entityId: 'test-user',
    roomId: uuidv4(),
    content: { text: 'Debug action chaining test' }
  };
  
  // Create a simple plan
  const planningContext = {
    goal: 'Debug action chaining',
    constraints: []
    availableActions: runtime.actions.map((a: any) => a.name),
    availableProviders: runtime.providers.map((p: any) => p.name),
    preferences: {
      executionModel: 'sequential' as const,
      maxSteps: 2,
      timeoutMs: 30000
    }
  };
  
  const plan = await planningService.createComprehensivePlan(
    runtime as any,
    planningContext
  );
  
  console.log(`📋 Plan created with ${plan.steps.length} steps:`);
  plan.steps.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step.actionName} (${step.id})`);
    console.log(`      Parameters: ${JSON.stringify(step.parameters)}`);
    console.log(`      Dependencies: [${step.dependencies?.join(', ') || 'none'}]`);
  });
  
  console.log('\n⚡ Manual execution with detailed debugging...\n');
  
  const results: any[] = [];
  
  // Execute step 1 manually
  console.log('🎯 Step 1: ANALYZE_INPUT');
  const analyzeAction = runtime.actions.find(a => a.name === 'ANALYZE_INPUT');
  if (analyzeAction) {
    const step1Options = {
      ...plan.steps[0].parameters,
      previousResults: []
      workingMemory: new Map(),
      abortSignal: null
    };
    
    console.log('   📊 Step 1 Options:', JSON.stringify(step1Options, null, 2));
    
    try {
      const result1 = await analyzeAction.handler(
        runtime,
        testMessage,
        { values: {}, data: {}, text: '' },
        step1Options,
        async (response: any) => {
          console.log(`   📤 Step 1 Response: ${response.text || JSON.stringify(response)}`);
          return [];
        }
      );
      
      console.log('   ✅ Step 1 Result:', JSON.stringify(result1, null, 2));
      results.push(result1);
      
    } catch (error) {
      console.log(`   ❌ Step 1 Error: ${error.message}`);
      return;
    }
  }
  
  console.log('\n🎯 Step 2: PROCESS_ANALYSIS');
  const processAction = runtime.actions.find(a => a.name === 'PROCESS_ANALYSIS');
  if (processAction) {
    const step2Options = {
      ...plan.steps[1].parameters,
      previousResults: results,
      workingMemory: new Map(),
      abortSignal: null
    };
    
    console.log('   📊 Step 2 Options:', JSON.stringify(step2Options, null, 2));
    console.log('   📋 Previous Results Length:', results.length);
    console.log('   📋 Previous Results[0]:', JSON.stringify(results[0], null, 2));
    console.log('   📋 Previous Results[0].data:', JSON.stringify(results[0]?.data, null, 2));
    
    try {
      const result2 = await processAction.handler(
        runtime,
        testMessage,
        { values: {}, data: {}, text: '' },
        step2Options,
        async (response: any) => {
          console.log(`   📤 Step 2 Response: ${response.text || JSON.stringify(response)}`);
          return [];
        }
      );
      
      console.log('   ✅ Step 2 Result:', JSON.stringify(result2, null, 2));
      
    } catch (error) {
      console.log(`   ❌ Step 2 Error: ${error.message}`);
      
      // Let's debug what the action is actually looking for
      console.log('\n🔍 Debugging PROCESS_ANALYSIS expectations:');
      console.log('   Action expects: options?.previousResults?.[0]?.data');
      console.log('   We provided: options.previousResults =', results.length > 0 ? 'array with items' : 'empty array');
      console.log('   First result has data:', !!results[0]?.data);
      console.log('   First result data contents:', Object.keys(results[0]?.data || {}));
    }
  }
  
  console.log('\n🎯 Now testing with planning service execution...\n');
  
  try {
    const executionResult = await planningService.executePlan(
      runtime as any,
      plan,
      testMessage as any
    );
    
    console.log('📊 Planning Service Execution Result:');
    console.log(`   Success: ${executionResult.success}`);
    console.log(`   Completed Steps: ${executionResult.completedSteps}/${executionResult.totalSteps}`);
    console.log(`   Duration: ${executionResult.duration}ms`);
    console.log(`   Results: ${executionResult.results.length}`);
    console.log(`   Errors: ${executionResult.errors?.length || 0}`);
    
    if (executionResult.errors && executionResult.errors.length > 0) {
      console.log('\n❌ Execution Errors:');
      executionResult.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.message}`);
      });
    }
    
    if (executionResult.results.length > 0) {
      console.log('\n📋 Execution Results:');
      executionResult.results.forEach((result, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(result, null, 2)}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Planning service execution failed: ${error.message}`);
  }
}

debugActionChaining();