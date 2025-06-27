#!/bin/bash

# Run Real Wallet Scenario Benchmarks
# This script executes wallet scenarios on testnets and mainnets

echo "🚀 Starting Wallet Scenario Benchmarks"
echo "===================================="
echo ""

# Check dependencies
echo "📦 Checking dependencies..."
if ! command -v bun &> /dev/null; then
    echo "❌ Error: bun is not installed"
    exit 1
fi

if ! command -v tsx &> /dev/null; then
    echo "❌ Error: tsx is not installed"
    echo "Installing tsx..."
    bun add -g tsx
fi

# Build the scenarios package
echo "🔨 Building scenarios package..."
cd ../../.. # Go to package root
bun run build

# Run testnet execution
echo ""
echo "🧪 Running testnet connections test..."
cd src/wallet-scenarios
tsx execute-real-tests.ts

# Run plugin generation (if needed)
echo ""
echo "🔧 Checking for missing plugins..."
tsx -e "
import { getMissingPlugins } from './index';
const missing = getMissingPlugins();
if (missing.length > 0) {
  console.log('Missing plugins:', missing);
  console.log('Run plugin generation with: tsx generate-missing-plugins.ts');
} else {
  console.log('✅ All required plugins are available');
}
"

# Run scenario validation
echo ""
echo "✔️ Validating all scenarios..."
tsx -e "
import { walletScenarios, validateScenario } from './index';
let allValid = true;
for (const scenario of walletScenarios) {
  const validation = validateScenario(scenario);
  if (!validation.valid) {
    console.log('❌', scenario.name, 'validation failed:', validation.errors);
    allValid = false;
  }
}
if (allValid) {
  console.log('✅ All scenarios are valid');
}
"

# Generate summary report
echo ""
echo "📊 Generating benchmark summary..."
tsx -e "
import { walletScenarios } from './index';
console.log('Total Scenarios:', walletScenarios.length);
console.log('Categories:', [...new Set(walletScenarios.map(s => s.category))].join(', '));
console.log('Total Required Plugins:', [...new Set(walletScenarios.flatMap(s => s.actors.flatMap(a => a.plugins || [])))].length);
"

echo ""
echo "✅ Benchmark complete!"
echo ""
echo "Next steps:"
echo "1. Fund test wallets using faucets"
echo "2. Set environment variables for API keys"
echo "3. Run individual scenarios with: tsx test-integration.ts"
echo "4. Monitor results in ./testnet-execution-report.json" 