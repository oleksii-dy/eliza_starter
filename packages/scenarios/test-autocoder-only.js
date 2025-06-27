#!/usr/bin/env node

/**
 * Test script specifically for AutoCoder scenarios
 */

import { runAutocoderTests, autocoderTestPresets } from './dist/autocoder/test-runner.js';

async function testAutocoderOnly() {
  console.log('🚀 Testing AutoCoder scenarios only...');
  
  try {
    // Run basic tests first
    console.log('\n📋 Running Basic Tests...');
    const basicResults = await runAutocoderTests(autocoderTestPresets.basic);
    
    console.log('\n📊 Basic Test Results:');
    console.log(`   Passed: ${basicResults.summary.passed}/${basicResults.summary.totalScenarios}`);
    console.log(`   Duration: ${(basicResults.summary.duration / 1000).toFixed(1)}s`);
    console.log(`   Score: ${(basicResults.summary.overallScore * 100).toFixed(1)}%`);
    
    // Run comprehensive tests
    console.log('\n📋 Running Comprehensive Tests...');
    const comprehensiveResults = await runAutocoderTests(autocoderTestPresets.comprehensive);
    
    console.log('\n📊 Comprehensive Test Results:');
    console.log(`   Passed: ${comprehensiveResults.summary.passed}/${comprehensiveResults.summary.totalScenarios}`);
    console.log(`   Duration: ${(comprehensiveResults.summary.duration / 1000).toFixed(1)}s`);
    console.log(`   Score: ${(comprehensiveResults.summary.overallScore * 100).toFixed(1)}%`);
    
    console.log('\n🎉 AutoCoder scenario testing completed!');
    console.log('\n📈 Summary:');
    console.log(`   Basic Tests: ${basicResults.summary.passed}/${basicResults.summary.totalScenarios} passed`);
    console.log(`   Comprehensive Tests: ${comprehensiveResults.summary.passed}/${comprehensiveResults.summary.totalScenarios} passed`);
    
    const totalPassed = basicResults.summary.passed + comprehensiveResults.summary.passed;
    const totalScenarios = basicResults.summary.totalScenarios + comprehensiveResults.summary.totalScenarios;
    const overallPassRate = totalScenarios > 0 ? (totalPassed / totalScenarios * 100).toFixed(1) : '0.0';
    
    console.log(`   Overall: ${totalPassed}/${totalScenarios} passed (${overallPassRate}%)`);
    
    return totalPassed === totalScenarios;
    
  } catch (error) {
    console.error('❌ AutoCoder test failed:', error);
    return false;
  }
}

// Run the test
testAutocoderOnly().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});