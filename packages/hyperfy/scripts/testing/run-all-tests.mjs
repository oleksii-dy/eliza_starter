#!/usr/bin/env node

/**
 * Run All Tests
 *
 * Comprehensive test suite that runs all validation tests
 */

import { checkWebGL } from './webgl-check.mjs'
import { runVisualValidation } from './visual-validation.mjs'

async function runAllTests() {
  console.log('🧪 Running Complete Test Suite...')
  console.log('═'.repeat(60))

  const results = {
    webgl: false,
    visual: false,
    overall: false,
  }

  try {
    // Check if servers are running
    console.log('🔍 Checking server availability...')
    try {
      const response = await fetch('http://localhost:4445')
      if (!response.ok) throw new Error('Frontend not responding')
      console.log('✅ Servers are running\n')
    } catch (error) {
      console.error('❌ Servers not running. Start them first with: bun run rpg:start')
      process.exit(1)
    }

    // Test 1: WebGL Context Check
    console.log('📋 Test 1: WebGL Context Check')
    console.log('-'.repeat(30))
    results.webgl = await checkWebGL()
    console.log('')

    if (!results.webgl) {
      console.log('❌ WebGL context failed, skipping visual tests')
      return results
    }

    // Test 2: Visual Validation
    console.log('📋 Test 2: Visual Validation')
    console.log('-'.repeat(30))
    const visualResult = await runVisualValidation({
      headless: true,
      saveResults: true,
    })
    results.visual = visualResult.success
    console.log('')

    // Overall result
    results.overall = results.webgl && results.visual
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    results.overall = false
  }

  // Final summary
  console.log('═'.repeat(60))
  console.log('📊 FINAL TEST RESULTS')
  console.log('═'.repeat(60))
  console.log(`WebGL Context: ${results.webgl ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Visual Validation: ${results.visual ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Overall Status: ${results.overall ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`)
  console.log('═'.repeat(60))

  if (results.overall) {
    console.log('🏆 The RPG visual testing environment is fully functional!')
  } else {
    console.log('🔧 Some components need attention before the RPG is ready.')
  }

  return results
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(results => {
      process.exit(results.overall ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test suite crashed:', error)
      process.exit(1)
    })
}

export { runAllTests }
