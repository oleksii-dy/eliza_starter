#!/usr/bin/env node

import('./dist/index.js').then(module => {
  console.log('🔍 Validating Real-World Scenarios...');
  console.log('');
  
  const scenarios = module.realWorldScenarios;
  const metadata = module.realWorldScenarioMetadata;
  
  let allValid = true;
  
  scenarios.forEach((scenario, i) => {
    console.log(`📋 Scenario ${i+1}: ${scenario.name}`);
    console.log(`   Category: ${scenario.category}`);
    console.log(`   Actors: ${scenario.actors.length}`);
    console.log(`   Tags: ${scenario.tags.length}`);
    console.log(`   Verification rules: ${scenario.verification?.rules?.length || 0}`);
    
    // Check required properties
    const required = ['id', 'name', 'description', 'category', 'actors', 'setup', 'execution', 'verification'];
    const missing = required.filter(prop => !scenario[prop]);
    
    if (missing.length > 0) {
      console.log(`   ❌ Missing: ${missing.join(', ')}`);
      allValid = false;
    } else {
      console.log(`   ✅ Structure valid`);
    }
    
    // Check if metadata exists
    const hasMetadata = Object.values(metadata).some(meta => meta.name === scenario.name);
    if (hasMetadata) {
      console.log(`   ✅ Metadata found`);
    } else {
      console.log(`   ⚠️  Metadata missing`);
    }
    
    console.log('');
  });
  
  // Summary
  console.log('📊 VALIDATION SUMMARY');
  console.log(`Total scenarios: ${scenarios.length}`);
  console.log(`Categories: ${Object.keys(module.realWorldScenarioCategories).length}`);
  console.log(`Metadata entries: ${Object.keys(metadata).length}`);
  console.log(`Status: ${allValid ? '✅ ALL VALID' : '❌ ISSUES FOUND'}`);
  
  // Check for production-ready features
  console.log('\n🚀 PRODUCTION FEATURES CHECK:');
  
  const features = {
    'Real API Integration': scenarios.some(s => s.metadata?.real_api_usage),
    'Artifact Creation': scenarios.some(s => s.metadata?.artifact_creation), 
    'Public Distribution': scenarios.some(s => s.metadata?.public_distribution),
    'Cron Jobs': scenarios.some(s => s.tags.includes('cron-jobs')),
    'Webhooks': scenarios.some(s => s.tags.includes('webhooks')),
    'Multi-agent': scenarios.some(s => s.tags.includes('multi-agent')),
    'GitHub Integration': scenarios.some(s => s.tags.includes('real-github')),
    'Production Tools': scenarios.some(s => s.tags.includes('production-tools'))
  };
  
  Object.entries(features).forEach(([feature, present]) => {
    console.log(`  ${present ? '✅' : '❌'} ${feature}`);
  });
  
  // Check specific scenario capabilities
  console.log('\n🎯 SCENARIO CAPABILITIES:');
  scenarios.forEach(scenario => {
    console.log(`\n📌 ${scenario.name}:`);
    console.log(`   Duration: ${scenario.metadata?.estimated_duration || 'not specified'}`);
    console.log(`   Cost: ${scenario.metadata?.estimated_cost || 'not specified'}`);
    console.log(`   Complexity: ${scenario.metadata?.complexity || 'not specified'}`);
    console.log(`   Required plugins: ${scenario.metadata?.plugins_required?.length || 0}`);
    console.log(`   Environment vars: ${scenario.metadata?.environment_requirements?.length || 0}`);
  });
  
}).catch(err => {
  console.error('❌ Validation failed:', err.message);
  process.exit(1);
});