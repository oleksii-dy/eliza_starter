# Rolodex Plugin Scenario Implementation

## Overview

We have successfully created a comprehensive suite of multi-agent scenarios for testing the Rolodex plugin's entity tracking, relationship building, trust management, and follow-up scheduling capabilities.

## What Was Created

### 1. TypeScript Scenario Files

Replaced the YAML scenarios with proper TypeScript scenarios compatible with the ElizaOS CLI scenario runner:

- **`entity-introduction.ts`** - Tests basic entity extraction with 5 agents
- **`relationship-building.ts`** - Tests relationship formation and evolution with 6 agents  
- **`trust-evolution.ts`** - Tests trust scoring and security detection with 7 agents
- **`complex-network.ts`** - Tests large-scale networking with 10 agents
- **`follow-up-management.ts`** - Tests follow-up scheduling with 8 agents

### 2. Supporting Files

- **`index.ts`** - Exports all scenarios and metadata
- **`README.md`** - Comprehensive documentation for the scenarios
- **`test-rolodex-scenarios.sh`** - Shell script to run all scenarios
- **`SCENARIO_IMPLEMENTATION.md`** - This summary document

### 3. Package.json Updates

Added scripts:
- `test:scenarios` - Runs the test runner script
- `scenario` - Helper to run scenarios from the plugin directory

## Key Features

### Multi-Agent Interactions
- Up to 10 agents running simultaneously
- Realistic conversations and interactions
- Different agent roles (subject, observer, adversary)

### Ground Truth Testing
Each scenario includes:
- Specific expected outcomes
- LLM-based verification rules
- Performance benchmarks
- Success criteria

### Comprehensive Coverage
The scenarios test:
- Entity extraction and tracking
- Relationship inference and strength
- Trust scoring and evolution
- Suspicious behavior detection
- Entity resolution and search
- Follow-up scheduling and management
- Network analysis at scale

## Running the Scenarios

### Individual Scenarios
```bash
cd ../cli
npm run scenario -- --scenarios "rolodex-entity-introduction"
```

### All Scenarios
```bash
# From plugin directory
npm run test:scenarios

# Or from CLI directory
elizaos scenario --filter "rolodex-*"
```

### With Options
```bash
# Verbose output
elizaos scenario --filter "rolodex-*" --verbose

# Benchmark mode
elizaos scenario --filter "rolodex-*" --benchmark

# Save results
elizaos scenario --filter "rolodex-*" --output-file results.json
```

## Scenario Structure

Each scenario follows the standard ElizaOS scenario format:

```typescript
{
  id: string,              // Unique identifier
  name: string,            // Display name
  description: string,     // What it tests
  category: string,        // 'rolodex'
  tags: string[],          // For filtering
  actors: ScenarioActor[], // Agent definitions
  setup: ScenarioSetup,    // Room configuration
  execution: {             // Timing controls
    maxDuration: number,
    maxSteps: number
  },
  verification: {          // Test assertions
    rules: VerificationRule[],
    groundTruth: GroundTruth
  },
  benchmarks: {            // Performance metrics
    targetAccuracy: number,
    customMetrics: Metric[]
  }
}
```

## Verification Approach

All verification uses LLM-based rules that check:

1. **Entity Tracking** - Were all entities properly tracked?
2. **Information Extraction** - Were roles, companies, etc. captured?
3. **Relationship Mapping** - Were connections identified?
4. **Trust Scoring** - Did trust evolve appropriately?
5. **Query Accuracy** - Do searches return correct results?

## Benefits

1. **Automated Testing** - No manual verification needed
2. **Scalable** - Tests with many agents simultaneously
3. **Realistic** - Natural conversations and interactions
4. **Comprehensive** - Covers all plugin features
5. **Repeatable** - Consistent test conditions

## Next Steps

1. Run the scenarios to establish baseline performance
2. Use results to identify areas for improvement
3. Add more scenarios as new features are added
4. Integrate into CI/CD pipeline
5. Create performance benchmarks

## Troubleshooting

If scenarios fail:

1. Check agent has rolodex plugin loaded
2. Verify action names match exports
3. Review timing - agents may need more wait time
4. Check verification criteria are reasonable
5. Examine transcript for unexpected behavior 