#!/usr/bin/env node

/**
 * RPG Visual Test Runner
 *
 * Simple script to run RPG visual tests with various options
 */

import { runRPGVisualTest } from './rpg-visual-test.mjs'

const args = process.argv.slice(2)
const options = {
  scenario: null,
  verbose: false,
  help: false,
}

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  switch (arg) {
    case '--scenario':
    case '-s':
      options.scenario = args[i + 1]
      i++
      break
    case '--verbose':
    case '-v':
      options.verbose = true
      break
    case '--help':
    case '-h':
      options.help = true
      break
  }
}

// Show help
if (options.help) {
  console.log(`
🎮 RPG Visual Test Runner

USAGE:
  npm run test:rpg                    # Run all RPG visual tests
  npm run test:rpg -- --scenario PLAYER_MOVEMENT  # Run specific scenario
  npm run test:rpg -- --verbose      # Enable verbose output

SCENARIOS:
  PLAYER_MOVEMENT   - Test player spawning and movement
  ENTITY_SPAWNING   - Test NPC, item, and chest spawning  
  COMBAT_SYSTEM     - Test combat interactions and animations
  LOOT_SYSTEM       - Test loot dropping and pickup
  EQUIPMENT_SYSTEM  - Test equipment equipping/unequipping

OUTPUT:
  Screenshots:  rpg-visual-tests/
  Videos:       rpg-visual-tests/videos/
  Reports:      rpg-visual-tests/reports/index.html

EXAMPLES:
  npm run test:rpg
  npm run test:rpg -- --scenario COMBAT_SYSTEM
  npm run test:rpg -- --verbose
`)
  process.exit(0)
}

// Run tests
console.log('🎯 Starting RPG Visual Tests...')
if (options.scenario) {
  console.log(`📋 Running scenario: ${options.scenario}`)
} else {
  console.log('📋 Running all scenarios')
}

try {
  const success = await runRPGVisualTest()

  if (success) {
    console.log('\n🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('\n💥 Some tests failed!')
    process.exit(1)
  }
} catch (error) {
  console.error('\n💥 Test runner failed:', error.message)
  console.error('Check the logs and try again.')
  process.exit(1)
}
