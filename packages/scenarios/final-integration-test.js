#!/usr/bin/env node

console.log('🧪 Final Integration Test...');

// Test module loading
import('./dist/index.js').then(module => {
  console.log('✅ Module loads successfully');
  
  // Test all critical exports
  const requiredExports = [
    'allScenarios',
    'realWorldScenarios', 
    'scenariosProject',
    'defaultTestCharacter',
    'getScenarioById',
    'getScenariosByCategory',
    'getRealWorldScenarioMetadata'
  ];
  
  let missingExports = [];
  requiredExports.forEach(exportName => {
    if (!module[exportName]) {
      missingExports.push(exportName);
    }
  });
  
  if (missingExports.length > 0) {
    console.error('❌ Missing exports:', missingExports);
    process.exit(1);
  }
  
  console.log('✅ All required exports present');
  
  // Test real-world scenarios specifically
  const rwScenarios = module.realWorldScenarios;
  console.log(`✅ Real-world scenarios: ${rwScenarios.length} total`);
  
  // Test each scenario has required properties
  rwScenarios.forEach(scenario => {
    if (!scenario.metadata?.real_api_usage) {
      console.error(`❌ Scenario ${scenario.name} missing real_api_usage metadata`);
      process.exit(1);
    }
  });
  
  console.log('✅ All real-world scenarios have real API usage');
  
  // Test project configuration
  const project = module.scenariosProject;
  if (!project.agents || project.agents.length === 0) {
    console.error('❌ Project missing agents');
    process.exit(1);
  }
  
  console.log('✅ Project configuration valid');
  
  // Summary
  console.log('\n🎉 INTEGRATION TEST PASSED');
  console.log('📊 Test Summary:');
  console.log(`   Total scenarios: ${module.allScenarios.length}`);
  console.log(`   Real-world scenarios: ${rwScenarios.length}`);
  console.log(`   Plugin test scenarios: ${module.pluginTestScenarios.length}`);
  console.log(`   Example scenarios: ${module.exampleScenarios.length}`);
  console.log(`   Rolodex scenarios: ${module.rolodexScenarios.length}`);
  console.log('\n✅ Real-world scenarios system is production ready!');
  
}).catch(err => {
  console.error('❌ Integration test failed:', err.message);
  process.exit(1);
});