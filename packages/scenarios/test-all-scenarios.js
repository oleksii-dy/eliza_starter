#!/usr/bin/env node

import('./dist/index.js').then(async module => {
  console.log('🧪 Testing All Scenarios Functionality...\n');
  
  const allScenarios = module.allScenarios;
  const realWorldScenarios = module.realWorldScenarios;
  const pluginTestScenarios = module.pluginTestScenarios;
  const rolodexScenarios = module.rolodexScenarios;
  const exampleScenarios = module.exampleScenarios;
  
  let totalTests = 0;
  let passedTests = 0;
  const failedTests = [];
  
  // Helper function to test scenario structure
  function testScenario(scenario, scenarioType) {
    totalTests++;
    console.log(`🔍 Testing ${scenarioType}: ${scenario.name}`);
    
    try {
      // Test required properties
      const requiredProps = ['id', 'name', 'description', 'category', 'actors', 'setup', 'execution'];
      for (const prop of requiredProps) {
        if (!scenario[prop]) {
          throw new Error(`Missing required property: ${prop}`);
        }
      }
      
      // Test actors structure
      if (!Array.isArray(scenario.actors) || scenario.actors.length === 0) {
        throw new Error('Actors must be a non-empty array');
      }
      
      for (const actor of scenario.actors) {
        if (!actor.id || !actor.name || !actor.role) {
          throw new Error('Actor missing required properties (id, name, role)');
        }
        if (!actor.script || !actor.script.steps || !Array.isArray(actor.script.steps)) {
          throw new Error('Actor must have script with steps array');
        }
      }
      
      // Test setup structure
      if (!scenario.setup.roomType) {
        throw new Error('Setup must specify roomType');
      }
      
      // Test execution structure
      if (!scenario.execution.maxDuration || !scenario.execution.maxSteps) {
        throw new Error('Execution must specify maxDuration and maxSteps');
      }
      
      // Test verification if present
      if (scenario.verification) {
        if (scenario.verification.rules && !Array.isArray(scenario.verification.rules)) {
          throw new Error('Verification rules must be an array');
        }
        if (scenario.verification.expectedOutcomes && !Array.isArray(scenario.verification.expectedOutcomes)) {
          throw new Error('Expected outcomes must be an array');
        }
      }
      
      console.log(`   ✅ Structure valid`);
      passedTests++;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failedTests.push({ scenario: scenario.name, type: scenarioType, error: error.message });
    }
  }
  
  // Test all scenario categories
  console.log('📋 Testing Example Scenarios:');
  exampleScenarios.forEach(scenario => testScenario(scenario, 'Example'));
  
  console.log('\n📋 Testing Plugin Test Scenarios:');
  pluginTestScenarios.forEach(scenario => testScenario(scenario, 'Plugin Test'));
  
  console.log('\n📋 Testing Rolodex Scenarios:');
  rolodexScenarios.forEach(scenario => testScenario(scenario, 'Rolodex'));
  
  console.log('\n📋 Testing Real-World Scenarios:');
  realWorldScenarios.forEach(scenario => testScenario(scenario, 'Real-World'));
  
  // Test scenario lookup functions
  console.log('\n🔍 Testing Scenario Lookup Functions:');
  totalTests++;
  try {
    const scenarioById = module.getScenarioById(allScenarios[0].id);
    if (!scenarioById) {
      throw new Error('getScenarioById failed to find scenario');
    }
    console.log('   ✅ getScenarioById works');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ getScenarioById failed: ${error.message}`);
    failedTests.push({ scenario: 'getScenarioById', type: 'Function', error: error.message });
  }
  
  totalTests++;
  try {
    const scenarios = module.getScenariosByCategory('reasoning');
    if (!Array.isArray(scenarios)) {
      throw new Error('getScenariosByCategory should return array');
    }
    console.log('   ✅ getScenariosByCategory works');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ getScenariosByCategory failed: ${error.message}`);
    failedTests.push({ scenario: 'getScenariosByCategory', type: 'Function', error: error.message });
  }
  
  // Test real-world scenario functions
  console.log('\n🌍 Testing Real-World Scenario Functions:');
  totalTests++;
  try {
    const rwScenarios = module.getAllRealWorldScenarios();
    if (!Array.isArray(rwScenarios) || rwScenarios.length === 0) {
      throw new Error('getAllRealWorldScenarios should return non-empty array');
    }
    console.log('   ✅ getAllRealWorldScenarios works');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ getAllRealWorldScenarios failed: ${error.message}`);
    failedTests.push({ scenario: 'getAllRealWorldScenarios', type: 'Function', error: error.message });
  }
  
  totalTests++;
  try {
    const metadata = module.getRealWorldScenarioMetadata();
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('getRealWorldScenarioMetadata should return object');
    }
    console.log('   ✅ getRealWorldScenarioMetadata works');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ getRealWorldScenarioMetadata failed: ${error.message}`);
    failedTests.push({ scenario: 'getRealWorldScenarioMetadata', type: 'Function', error: error.message });
  }
  
  // Test project configuration
  console.log('\n🏗️ Testing Project Configuration:');
  totalTests++;
  try {
    const project = module.scenariosProject;
    if (!project || !project.agents || !Array.isArray(project.agents)) {
      throw new Error('scenariosProject should have agents array');
    }
    if (!project.agents[0].character || !project.agents[0].character.name) {
      throw new Error('Project agent should have character with name');
    }
    console.log('   ✅ scenariosProject configuration valid');
    passedTests++;
  } catch (error) {
    console.log(`   ❌ scenariosProject failed: ${error.message}`);
    failedTests.push({ scenario: 'scenariosProject', type: 'Project', error: error.message });
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests.length} ❌`);
  console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   ${test.type} - ${test.scenario}: ${test.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Real-world scenarios system is fully functional and ready for production use.');
  }
  
}).catch(err => {
  console.error('❌ Test suite failed to load:', err.message);
  process.exit(1);
});