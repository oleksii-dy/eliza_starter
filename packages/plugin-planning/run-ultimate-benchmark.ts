#!/usr/bin/env tsx

/**
 * Ultimate benchmark test - Most challenging REALM-Bench inspired scenario
 * Tests the absolute limits of the planning system
 */

import { planningPlugin } from './src/minimal-plugin';

interface UltimateBenchmarkCase {
  id: string;
  name: string;
  category: 'ultimate-challenge';
  description: string;
  userInput: string;
  scenarioContext: {
    domain: string;
    stakeholders: string[];
    constraints: string[];
    dependencies: string[];
  };
  expectedOutcomes: {
    planComplexity: 'high';
    minSteps: number;
    maxSteps: number;
    requiredCapabilities: string[];
    successCriteria: string[];
  };
}

// Ultimate challenge inspired by real-world scenarios
const ultimateBenchmark: UltimateBenchmarkCase = {
  id: 'realm-ultimate-001',
  name: 'Enterprise Digital Transformation Planning',
  category: 'ultimate-challenge',
  description: 'Complete enterprise-level project planning with multiple stakeholders, dependencies, and constraints',
  userInput: `We need to plan a complete digital transformation for our enterprise. This involves:
    1. Migrating our legacy systems to cloud infrastructure
    2. Implementing new AI-powered customer service tools
    3. Training 500+ employees on new technologies
    4. Ensuring zero downtime during migration
    5. Integrating with 15+ external vendor APIs
    6. Meeting compliance requirements for financial data
    7. Creating comprehensive documentation and rollback plans
    8. Coordinating with legal, IT, security, and business teams
    
    The project has a $2M budget, 6-month timeline, and needs approval from the board. 
    Please create a comprehensive strategic plan that addresses all stakeholders, 
    manages dependencies, mitigates risks, and ensures successful execution.`,
    
  scenarioContext: {
    domain: 'Enterprise Digital Transformation',
    stakeholders: ['Board', 'IT Team', 'Legal', 'Security', 'Business Units', 'Employees', 'External Vendors'],
    constraints: ['$2M Budget', '6-month Timeline', 'Zero Downtime', 'Compliance Requirements'],
    dependencies: ['Legacy System Assessment', 'Vendor Negotiations', 'Training Development', 'Security Audits']
  },
  
  expectedOutcomes: {
    planComplexity: 'high',
    minSteps: 8,
    maxSteps: 15,
    requiredCapabilities: [
      'stakeholder management',
      'risk assessment', 
      'resource planning',
      'timeline coordination',
      'compliance validation',
      'technical implementation'
    ],
    successCriteria: [
      'comprehensive plan created',
      'all stakeholders addressed',
      'risks identified and mitigated',
      'timeline and budget considered',
      'compliance requirements included',
      'execution strategy defined'
    ]
  }
};

class UltimateBenchmarkRuntime {
  agentId = 'ultimate-planning-agent';
  logs: string[] = [];
  actions: string[] = [];
  responses: string[] = [];
  planAnalysis: {
    stakeholdersCovered: string[];
    constraintsAddressed: string[];
    riskFactorsIdentified: string[];
    implementationPhases: string[];
  } = {
    stakeholdersCovered: [],
    constraintsAddressed: [],
    riskFactorsIdentified: [],
    implementationPhases: []
  };
  
  metrics: {
    startTime: number;
    endTime?: number;
    duration?: number;
    planComplexity?: string;
    stepCount?: number;
    comprehensiveness?: number;
  };

  constructor() {
    this.metrics = { startTime: Date.now() };
  }

  log(message: string) {
    this.logs.push(message);
    console.log(`[ULTIMATE] ${message}`);
  }

  recordAction(action: string) {
    this.actions.push(action);
    this.log(`🎬 Action executed: ${action}`);
  }

  recordResponse(response: string) {
    this.responses.push(response);
    this.log(`📤 Response: ${response}`);
    
    // Analyze response for stakeholder coverage, constraints, etc.
    this.analyzeResponse(response);
  }

  analyzeResponse(response: string) {
    const responseLower = response.toLowerCase();
    
    // Check stakeholder coverage
    const stakeholders = ['board', 'it', 'legal', 'security', 'business', 'employees', 'vendors'];
    stakeholders.forEach(stakeholder => {
      if (responseLower.includes(stakeholder) && !this.planAnalysis.stakeholdersCovered.includes(stakeholder)) {
        this.planAnalysis.stakeholdersCovered.push(stakeholder);
      }
    });

    // Check constraint consideration
    const constraints = ['budget', 'timeline', 'downtime', 'compliance'];
    constraints.forEach(constraint => {
      if (responseLower.includes(constraint) && !this.planAnalysis.constraintsAddressed.includes(constraint)) {
        this.planAnalysis.constraintsAddressed.push(constraint);
      }
    });

    // Check risk identification
    const riskIndicators = ['risk', 'mitigation', 'contingency', 'backup', 'rollback'];
    riskIndicators.forEach(risk => {
      if (responseLower.includes(risk) && !this.planAnalysis.riskFactorsIdentified.includes(risk)) {
        this.planAnalysis.riskFactorsIdentified.push(risk);
      }
    });

    // Check implementation phases
    const phases = ['assessment', 'migration', 'training', 'integration', 'testing', 'deployment'];
    phases.forEach(phase => {
      if (responseLower.includes(phase) && !this.planAnalysis.implementationPhases.includes(phase)) {
        this.planAnalysis.implementationPhases.push(phase);
      }
    });
  }

  finalize() {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    
    // Calculate comprehensiveness score
    const stakeholderScore = this.planAnalysis.stakeholdersCovered.length / 7;
    const constraintScore = this.planAnalysis.constraintsAddressed.length / 4;
    const riskScore = Math.min(this.planAnalysis.riskFactorsIdentified.length / 3, 1);
    const phaseScore = this.planAnalysis.implementationPhases.length / 6;
    
    this.metrics.comprehensiveness = (stakeholderScore + constraintScore + riskScore + phaseScore) / 4;
  }

  getUltimateReport() {
    return {
      actions: this.actions,
      responses: this.responses,
      metrics: this.metrics,
      planAnalysis: this.planAnalysis,
      totalLogs: this.logs.length,
      comprehensiveness: this.metrics.comprehensiveness
    };
  }
}

async function runUltimateBenchmark() {
  console.log('🚀 ULTIMATE PLANNING BENCHMARK');
  console.log('==============================');
  console.log('🎯 The Most Challenging Planning Test');
  console.log('💼 Enterprise Digital Transformation Scenario');
  console.log('');

  const testCase = ultimateBenchmark;
  const runtime = new UltimateBenchmarkRuntime();

  console.log(`📋 Scenario: ${testCase.name}`);
  console.log(`🏢 Domain: ${testCase.scenarioContext.domain}`);
  console.log(`👥 Stakeholders: ${testCase.scenarioContext.stakeholders.join(', ')}`);
  console.log(`⚠️ Constraints: ${testCase.scenarioContext.constraints.join(', ')}`);
  console.log(`🔗 Dependencies: ${testCase.scenarioContext.dependencies.join(', ')}`);
  console.log('');
  console.log('📝 Complex User Request:');
  console.log(testCase.userInput);
  console.log('');

  try {
    // Ultimate Classification Test
    console.log('🧠 Phase 1: Ultimate Message Classification');
    console.log('==========================================');
    
    const classifier = planningPlugin.providers?.[0];
    if (!classifier) {
      throw new Error('Message classifier provider not found');
    }

    const mockMessage = {
      content: { text: testCase.userInput },
      entityId: 'enterprise-user',
      roomId: 'boardroom',
    };

    const classificationResult = await classifier.get(runtime as any, mockMessage as any, {} as any);
    runtime.log(`Classification: ${classificationResult.values?.messageClassification}`);
    runtime.log(`Complexity: ${classificationResult.values?.complexity}`);
    runtime.log(`Multi-step detected: ${classificationResult.values?.hasMultiStep}`);
    runtime.log(`Strategic planning required: ${classificationResult.values?.hasStrategic}`);
    runtime.log(`Complex task identified: ${classificationResult.values?.hasComplexTask}`);
    
    console.log('✅ Ultimate classification analysis completed');
    console.log('');

    // Ultimate Plan Creation Test
    console.log('📋 Phase 2: Ultimate Plan Creation');
    console.log('===================================');
    
    const createPlanAction = planningPlugin.actions?.find(a => a.name === 'CREATE_PLAN');
    if (!createPlanAction) {
      throw new Error('CREATE_PLAN action not found');
    }

    const shouldCreatePlan = await createPlanAction.validate(runtime as any, mockMessage as any);
    console.log(`🎯 Plan creation validation: ${shouldCreatePlan ? '✅ Valid' : '❌ Invalid'}`);

    if (!shouldCreatePlan) {
      throw new Error('Plan creation validation failed for ultimate benchmark');
    }

    const responses: string[] = [];
    const mockCallback = async (content: any) => {
      const response = content.text || content.thought || 'Response received';
      responses.push(response);
      runtime.recordResponse(response);
      console.log(`💬 Agent Response: ${response}`);
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
    
    console.log(`✅ Ultimate plan created!`);
    console.log(`   🎯 Complexity: ${runtime.metrics.planComplexity}`);
    console.log(`   📊 Steps: ${runtime.metrics.stepCount}`);
    console.log(`   📋 Goal: ${planResult.values?.plan?.goal?.substring(0, 80)}...`);
    console.log('');

    // Ultimate Plan Execution Test
    console.log('⚡ Phase 3: Ultimate Plan Execution');
    console.log('===================================');
    
    const executePlanAction = planningPlugin.actions?.find(a => a.name === 'EXECUTE_PLAN');
    if (!executePlanAction) {
      throw new Error('EXECUTE_PLAN action not found');
    }

    const stateWithPlan = {
      values: { ...classificationResult.values, ...planResult.values },
      data: { ...classificationResult.data, ...planResult.data },
      text: ''
    };

    const shouldExecute = await executePlanAction.validate(runtime as any, mockMessage as any, stateWithPlan);
    console.log(`🎯 Execution validation: ${shouldExecute ? '✅ Valid' : '❌ Invalid'}`);

    if (shouldExecute) {
      console.log('🚀 Executing ultimate plan...');
      
      const executionResult = await executePlanAction.handler(
        runtime as any,
        mockMessage as any,
        stateWithPlan,
        {},
        mockCallback
      );

      runtime.recordAction('EXECUTE_PLAN');
      console.log('✅ Ultimate plan execution completed!');
    }

    runtime.finalize();

    // Ultimate Validation and Scoring
    console.log('');
    console.log('📈 Phase 4: Ultimate Benchmark Validation');
    console.log('=========================================');
    
    const report = runtime.getUltimateReport();
    
    // Action validation
    const requiredActions = ['CREATE_PLAN', 'EXECUTE_PLAN'];
    const actionMatches = requiredActions.filter(action => 
      runtime.actions.includes(action)
    );
    const actionScore = actionMatches.length / requiredActions.length;

    // Step count validation
    const stepCount = runtime.metrics.stepCount || 0;
    const stepCountValid = stepCount >= testCase.expectedOutcomes.minSteps && 
                          stepCount <= testCase.expectedOutcomes.maxSteps;
    const stepScore = stepCountValid ? 1.0 : Math.max(0.5, stepCount / testCase.expectedOutcomes.maxSteps);

    // Comprehensiveness validation
    const comprehensivenessScore = runtime.metrics.comprehensiveness || 0;

    // Success criteria validation
    const successCriteria = testCase.expectedOutcomes.successCriteria;
    const criteriaMatches = successCriteria.filter(criteria => {
      return runtime.responses.some(response => 
        response.toLowerCase().includes(criteria.toLowerCase().split(' ')[0])
      );
    });
    const criteriaScore = criteriaMatches.length / successCriteria.length;

    // Calculate ultimate score
    const ultimateScore = (actionScore + stepScore + comprehensivenessScore + criteriaScore) / 4;

    console.log('🎯 ULTIMATE BENCHMARK RESULTS');
    console.log('============================');
    console.log(`📊 Action Execution: ${(actionScore * 100).toFixed(1)}% (${actionMatches.length}/${requiredActions.length})`);
    console.log(`📈 Step Count: ${(stepScore * 100).toFixed(1)}% (${stepCount} steps, valid: ${stepCountValid})`);
    console.log(`🎭 Comprehensiveness: ${(comprehensivenessScore * 100).toFixed(1)}%`);
    console.log(`✅ Success Criteria: ${(criteriaScore * 100).toFixed(1)}% (${criteriaMatches.length}/${successCriteria.length})`);
    console.log('');
    console.log(`🏆 ULTIMATE SCORE: ${(ultimateScore * 100).toFixed(1)}%`);
    console.log(`⏱️ Execution Time: ${runtime.metrics.duration}ms`);
    console.log('');

    // Detailed analysis
    console.log('🔍 DETAILED ANALYSIS');
    console.log('===================');
    console.log(`👥 Stakeholders Covered: ${report.planAnalysis.stakeholdersCovered.join(', ') || 'None detected'}`);
    console.log(`⚠️ Constraints Addressed: ${report.planAnalysis.constraintsAddressed.join(', ') || 'None detected'}`);
    console.log(`🛡️ Risk Factors Identified: ${report.planAnalysis.riskFactorsIdentified.join(', ') || 'None detected'}`);
    console.log(`🔄 Implementation Phases: ${report.planAnalysis.implementationPhases.join(', ') || 'None detected'}`);
    console.log('');

    // Final assessment
    if (ultimateScore >= 0.9) {
      console.log('🎉 ULTIMATE BENCHMARK: EXCEPTIONAL!');
      console.log('🚀 The planning system demonstrates enterprise-grade capabilities.');
      console.log('💼 Ready for the most complex real-world scenarios.');
    } else if (ultimateScore >= 0.8) {
      console.log('✅ ULTIMATE BENCHMARK: EXCELLENT!');
      console.log('🏆 The planning system shows strong enterprise planning abilities.');
      console.log('🔧 Minor optimizations could push it to exceptional level.');
    } else if (ultimateScore >= 0.7) {
      console.log('👍 ULTIMATE BENCHMARK: GOOD!');
      console.log('📈 The planning system handles complex scenarios well.');
      console.log('🛠️ Several improvements needed for enterprise readiness.');
    } else {
      console.log('⚠️ ULTIMATE BENCHMARK: NEEDS IMPROVEMENT!');
      console.log('🔨 Significant enhancements required for complex scenarios.');
      console.log('📚 Review planning algorithms and capability coverage.');
    }

    return ultimateScore >= 0.7;

  } catch (error) {
    console.error('💥 Ultimate benchmark failed:', error.message);
    runtime.finalize();
    return false;
  }
}

runUltimateBenchmark().then(success => {
  console.log('');
  console.log(success ? '🎊 Ultimate benchmark completed successfully!' : '💔 Ultimate benchmark failed');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error in ultimate benchmark:', error);
  process.exit(1);
});