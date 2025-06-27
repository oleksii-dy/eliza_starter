# AutoCoder Scenarios

Comprehensive test scenarios for the ElizaOS AutoCoder interface (`elizaos code` command). These scenarios validate the AutoCoder's capabilities across code generation, artifact management, swarm coordination, and GitHub integration.

## Overview

The AutoCoder scenarios are organized into five main test suites:

1. **Basic Tests** - Core functionality validation
2. **Comprehensive Benchmarks** - Advanced capabilities testing
3. **Swarm Coordination** - Multi-agent collaboration
4. **Artifact Management** - Storage and organization
5. **GitHub Integration** - Repository and collaboration workflows

## Test Suites

### 1. Basic Test Suite

Tests fundamental AutoCoder capabilities:

- **Basic Code Generation**: Simple TypeScript function creation with tests
- **API Integration**: REST client creation with error handling and retry logic
- **File Organization**: Modular system architecture with proper file structure

**Duration**: ~5-10 minutes  
**Requirements**: AutoCoder service, basic LLM access

### 2. Comprehensive Benchmarks

Advanced testing for complex scenarios:

- **Complex Refactoring**: Legacy JavaScript to modern TypeScript conversion
- **Debugging Scenario**: Multi-bug identification and resolution
- **Performance Optimization**: Algorithm complexity improvements

**Duration**: ~15-20 minutes  
**Requirements**: AutoCoder service, advanced reasoning capabilities

### 3. Swarm Coordination Suite

Multi-agent collaboration testing:

- **Microservice Project**: Complete microservice development with specialized agents
- **Bug Triage Project**: Complex issue investigation and resolution workflow

**Duration**: ~30-45 minutes  
**Requirements**: Swarm orchestration, GitHub coordination, multiple agent instances

### 4. Artifact Management Suite

Artifact storage and lifecycle testing:

- **Artifact Storage**: Multi-component library creation with proper organization
- **Artifact Versioning**: Iterative development and version management
- **Artifact Search**: Discovery and reuse of existing components

**Duration**: ~10-15 minutes  
**Requirements**: Artifact storage service, local storage capabilities

### 5. GitHub Integration Suite

GitHub-based collaboration workflows:

- **Repository Setup**: GitHub coordinator initialization and testing
- **Collaboration Workflow**: Multi-agent GitHub collaboration with branches and PRs
- **Artifact Organization**: Cross-repository artifact categorization

**Duration**: ~15-25 minutes  
**Requirements**: GitHub token, elizaos-artifacts organization access

## Usage

### Running Tests Programmatically

```typescript
import { runAutocoderTests, autocoderTestPresets } from './test-runner.js';

// Run basic tests only
const basicResults = await runAutocoderTests(autocoderTestPresets.basic);

// Run comprehensive tests
const comprehensiveResults = await runAutocoderTests(autocoderTestPresets.comprehensive);

// Run full test suite (requires all dependencies)
const fullResults = await runAutocoderTests(autocoderTestPresets.full);

// Custom configuration
const customResults = await runAutocoderTests({
  suites: ['basic', 'artifacts'],
  verbose: true,
  outputFile: './autocoder-test-results.json',
  benchmarkMode: true,
});
```

### Running via CLI

```bash
# Run through ElizaOS test runner
elizaos test --filter autocoder

# Run specific categories
elizaos test --filter autocoder-basic
elizaos test --filter autocoder-advanced
elizaos test --filter autocoder-swarm
elizaos test --filter autocoder-artifacts
elizaos test --filter autocoder-github
```

### Environment Setup

#### Basic Setup (for basic and comprehensive tests)

```bash
# Set up environment variables
export OPENAI_API_KEY="your-openai-key"
# or
export ANTHROPIC_API_KEY="your-anthropic-key"

# Ensure PostgreSQL is available
export POSTGRES_URL="postgresql://user:pass@localhost:5432/elizaos"
```

#### GitHub Integration Setup

```bash
# GitHub token with repo permissions
export GITHUB_TOKEN="your-github-token"

# Ensure access to elizaos-artifacts organization
# Contact ElizaOS team for organization access
```

#### Swarm Testing Setup

```bash
# Additional memory and processing power recommended
# Consider running on dedicated test infrastructure

# Optional: Configure custom swarm limits
export AUTOCODER_MAX_AGENTS=4
export AUTOCODER_SWARM_TIMEOUT=1800000  # 30 minutes
```

## Scenario Details

### Basic Code Generation Scenario

**Objective**: Validate core code generation capabilities  
**Input**: Request for email validation function with tests  
**Expected Output**:
- TypeScript function with proper types
- Comprehensive unit tests
- Code artifact storage
- Quality score >90%

**Validation Criteria**:
- Syntactically correct TypeScript
- Proper regex implementation
- Comprehensive test coverage
- Artifact metadata completeness

### Complex Refactoring Scenario

**Objective**: Test advanced code modernization capabilities  
**Input**: Legacy JavaScript class with prototype methods  
**Expected Output**:
- Modern TypeScript class implementation
- Async/await instead of callbacks
- Proper error handling and types
- JSDoc documentation

**Validation Criteria**:
- Complete elimination of legacy patterns
- Modern TypeScript best practices
- Maintained functionality
- Improved error handling

### Swarm Microservice Scenario

**Objective**: Validate multi-agent coordination for complex projects  
**Input**: Microservice requirements with multiple specialized roles  
**Expected Output**:
- Complete microservice implementation
- Architecture documentation
- Comprehensive test suite
- CI/CD configuration
- GitHub coordination artifacts

**Validation Criteria**:
- Effective task delegation
- Quality implementation across all agents
- Proper GitHub workflow
- Complete deliverable set

### Artifact Organization Scenario

**Objective**: Test artifact management and categorization  
**Input**: Request for diverse utility library components  
**Expected Output**:
- Multiple properly categorized artifacts
- Comprehensive metadata
- Logical file organization
- Searchable artifact structure

**Validation Criteria**:
- Proper artifact type classification
- Complete metadata for all artifacts
- Logical grouping and naming
- Repository organization quality

## Metrics and Benchmarks

### Performance Metrics

- **Response Time**: Average time to generate code artifacts
- **Code Quality**: Syntax correctness, best practices adherence
- **Test Coverage**: Completeness of generated test suites
- **Artifact Organization**: Quality of file structure and metadata

### Benchmark Thresholds

| Metric | Basic | Advanced | Swarm |
|--------|--------|----------|-------|
| Success Rate | >90% | >85% | >80% |
| Code Quality Score | >8.5/10 | >8.0/10 | >7.5/10 |
| Response Time | <60s | <180s | <1800s |
| Artifact Completeness | >95% | >90% | >85% |

### Quality Scoring

Scenarios are scored across multiple dimensions:

1. **Functional Correctness** (40%): Does the code work as intended?
2. **Code Quality** (30%): Follows best practices, properly structured
3. **Completeness** (20%): All requirements addressed
4. **Organization** (10%): Proper artifact management and structure

## Troubleshooting

### Common Issues

#### Test Failures in Basic Suite
- Check LLM API key configuration
- Verify PostgreSQL connectivity
- Ensure sufficient memory allocation

#### GitHub Integration Failures
- Verify GitHub token permissions
- Check elizaos-artifacts organization access
- Confirm network connectivity to GitHub API

#### Swarm Coordination Issues
- Increase timeout values for complex scenarios
- Check resource availability (CPU, memory)
- Verify all required services are running

#### Artifact Storage Problems
- Check local storage permissions
- Verify artifact service initialization
- Review telemetry logs for storage errors

### Debug Mode

Enable verbose logging for detailed execution information:

```typescript
const results = await runAutocoderTests({
  verbose: true,
  telemetryEnabled: true,
  outputFile: './debug-results.json'
});
```

### Test Environment Isolation

For reliable testing, consider running in isolated environments:

```bash
# Docker-based isolation
docker run -e OPENAI_API_KEY=$OPENAI_API_KEY elizaos/test-runner autocoder

# Separate test database
export POSTGRES_URL="postgresql://user:pass@localhost:5433/elizaos_test"
```

## Contributing

### Adding New Scenarios

1. Create scenario file in appropriate category directory
2. Follow the established `Scenario` interface
3. Include comprehensive verification rules
4. Add to the appropriate test suite
5. Update this README with scenario details

### Scenario Development Guidelines

- **Clear Objectives**: Each scenario should test specific capabilities
- **Realistic Requirements**: Use real-world development scenarios
- **Comprehensive Validation**: Include multiple verification approaches
- **Proper Categorization**: Place in appropriate test suite
- **Performance Considerations**: Set realistic timeouts and resource limits

### Testing New Scenarios

```typescript
// Test individual scenario during development
import { ScenarioRunner } from '@elizaos/scenarios';

const runner = new ScenarioRunner();
const result = await runner.runScenario(myNewScenario);
console.log('Scenario result:', result);
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: AutoCoder Tests
on: [push, pull_request]

jobs:
  autocoder-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: bun install
      
      - name: Run AutoCoder basic tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
        run: elizaos test --filter autocoder-basic
      
      - name: Run AutoCoder advanced tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
        run: elizaos test --filter autocoder-advanced
```

### Performance Monitoring

Set up monitoring for test execution metrics:

```typescript
// Benchmark tracking
const benchmarkResults = await runAutocoderTests({
  benchmarkMode: true,
  outputFile: `./benchmarks/autocoder-${Date.now()}.json`
});

// Track trends over time
trackBenchmarkTrends(benchmarkResults);
```

## Roadmap

### Planned Enhancements

- **Visual Testing**: UI component generation validation
- **API Integration**: Real API testing with external services
- **Performance Profiling**: Detailed performance analysis
- **Multi-language Support**: Python, Java, Rust scenarios
- **Deployment Testing**: End-to-end deployment validation

### Version History

- **v1.0.0**: Initial release with basic and comprehensive suites
- **v1.1.0**: Added swarm coordination capabilities
- **v1.2.0**: GitHub integration and artifact management
- **v1.3.0**: Enhanced benchmarking and telemetry