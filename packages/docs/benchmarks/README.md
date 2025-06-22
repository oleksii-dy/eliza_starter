# ElizaOS Research Plugin Benchmarks

This directory contains benchmark results for the ElizaOS Research Plugin, demonstrating its capabilities across various research tasks and domains.

## About the Research Plugin

The ElizaOS Research Plugin provides PhD-level deep research capabilities with multi-phase internet research, advanced content extraction, and sophisticated evaluation using RACE (Reference-based Adaptive Criteria-driven Evaluation) and FACT (Framework for Factual Abundance and Citation Trustworthiness) methodologies.

## Benchmark Suites

### DeepResearch Bench
Tests PhD-level research capabilities across multiple academic domains with complex, multi-faceted queries requiring deep analysis and synthesis.

**Focus**: Research depth and quality
**Timeout**: 10 minutes per query
**Domains**: Physics, Biology, Climate Science, AI Safety, Medicine

### Breadth Benchmark  
Evaluates research capabilities across diverse domains with moderate depth, testing the system's versatility and domain knowledge.

**Focus**: Cross-domain versatility
**Timeout**: 5 minutes per query  
**Domains**: Technology, Economics, Psychology, History, Philosophy

### Speed Benchmark
Measures research efficiency with surface-level queries, focusing on rapid information retrieval and basic fact-finding.

**Focus**: Research speed and efficiency
**Timeout**: 2 minutes per query
**Domains**: Energy, Machine Learning, Finance, Health, Space

### Accuracy Benchmark
Tests factual accuracy and citation quality using well-established topics with clear documentation.

**Focus**: Factual accuracy and citations
**Timeout**: 6 minutes per query
**Domains**: Biology, History, Chemistry, Law, Physics

### Comprehensive Benchmark
Full evaluation across all dimensions: depth, breadth, speed, and accuracy, providing a complete assessment of research capabilities.

**Focus**: Complete capability assessment
**Timeout**: 10 minutes per query
**Coverage**: All benchmark types combined

## Evaluation Metrics

### RACE Score (Reference-based Adaptive Criteria-driven Evaluation)
- **Comprehensiveness**: How thoroughly the research covers all relevant aspects
- **Depth**: Level of detail and expertise demonstrated  
- **Instruction Following**: How well the research addresses specific requirements
- **Readability**: Clarity, organization, and accessibility

### FACT Score (Framework for Factual Abundance and Citation Trustworthiness)
- **Citation Accuracy**: Accuracy of citations and references
- **Effective Citations**: Number of high-quality, verified citations
- **Source Credibility**: Reliability and authority of sources used

### Quality Grades

- **A (90-100%)**: Exceptional research quality with comprehensive coverage and expert-level analysis
- **B (80-89%)**: High-quality research with good depth and solid methodology
- **C (70-79%)**: Adequate research meeting basic requirements with room for improvement
- **D (60-69%)**: Below-average research with significant gaps or issues
- **F (<60%)**: Poor research quality requiring substantial improvement

## Running Benchmarks

### Prerequisites

Set required environment variables:

```bash
# AI Model (required - choose one)
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"

# Search Provider (required - choose one)
export TAVILY_API_KEY="your-tavily-key"
export SERPER_API_KEY="your-serper-key"
export EXA_API_KEY="your-exa-key"
export SERPAPI_API_KEY="your-serpapi-key"

# Content Extraction (optional)
export FIRECRAWL_API_KEY="your-firecrawl-key"
export SEMANTIC_SCHOLAR_API_KEY="your-semantic-scholar-key"
```

### Command Line Interface

```bash
# Install dependencies
cd packages/plugin-research
npm install

# Run all benchmarks
npm run benchmark

# Run specific benchmarks
npm run benchmark:deepresearch
npm run benchmark:breadth  
npm run benchmark:speed
npm run benchmark:accuracy
npm run benchmark:comprehensive

# Run with custom output directory
npm run benchmark comprehensive ./my-results

# Use the CLI tool directly
npm run benchmark:cli list
npm run benchmark:cli run deepresearch
npm run benchmark:cli results --latest
```

### Programmatic Usage

```typescript
import { BenchmarkRunner } from '@elizaos/plugin-research/benchmarks';
import { DEEPRESEARCH_BENCH } from '@elizaos/plugin-research/benchmarks/standard-benchmarks';

const runner = new BenchmarkRunner(runtime, researchService);
const result = await runner.runBenchmark(DEEPRESEARCH_BENCH);
```

## Configuration

### Research Settings

```bash
# Research Configuration
export RESEARCH_MAX_RESULTS=50        # Maximum search results per query
export RESEARCH_TIMEOUT=600000        # Timeout in milliseconds (10 minutes)
export RESEARCH_DEPTH=deep            # Research depth: surface, moderate, deep, phd_level
export RESEARCH_DOMAIN=general        # Default research domain
export RESEARCH_EVALUATION_ENABLED=true  # Enable RACE/FACT evaluation
```

### Benchmark Customization

Create custom benchmark configurations:

```typescript
import { BenchmarkConfig } from '@elizaos/plugin-research/benchmarks';

const customBench: BenchmarkConfig = {
  name: 'Custom Research Benchmark',
  description: 'Custom evaluation for specific use case',
  outputDir: './my-benchmarks',
  timeoutMs: 300000, // 5 minutes
  includeReport: true,
  queries: [
    {
      id: 'custom_query_1',
      query: 'Your research question here',
      domain: 'computer_science',
      depth: 'deep',
      expectedSources: 15,
      maxDurationMs: 480000,
      description: 'Custom query description'
    }
  ]
};
```

## Output Files

Each benchmark run generates:

- `{benchmark}_{runId}.json`: Raw benchmark results with detailed metrics
- `{benchmark}_{runId}_report.md`: Human-readable benchmark report
- `benchmark_summary.json`: Aggregated summary of all results (when multiple benchmarks)
- `README.md`: This summary document (auto-updated)

## Understanding Results

### Sample Result Structure

```json
{
  "benchmarkName": "DeepResearch Bench",
  "runId": "run_20240101_120000",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "summary": {
    "totalQueries": 5,
    "successfulQueries": 5,
    "qualityGrade": "A",
    "averageDuration": 285000,
    "averageSourcesFound": 18.2,
    "averageRaceScore": 0.87,
    "averageFactScore": 0.83
  },
  "queryResults": [...],
  "config": {...}
}
```

### Performance Indicators

- **Success Rate**: Percentage of queries completed without errors
- **Quality Grade**: Overall assessment based on RACE/FACT scores
- **Average Duration**: Mean time per query (should be under timeout)
- **Sources Found**: Average number of sources retrieved per query
- **RACE Score**: Content quality and comprehensiveness (0-1)
- **FACT Score**: Citation accuracy and credibility (0-1)

## Troubleshooting

### Common Issues

1. **No AI Model Available**: Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set
2. **No Search Provider**: Configure at least one search API key
3. **Timeout Errors**: Increase `RESEARCH_TIMEOUT` for complex queries
4. **Rate Limiting**: Some providers have usage limits; wait and retry
5. **Memory Issues**: Large benchmarks may require more system memory

### Debug Mode

```bash
# Enable detailed logging
export DEBUG=eliza:research:*
npm run benchmark:deepresearch
```

### Validation

```bash
# Validate environment before running
npm run benchmark:cli validate
```

## Contributing

To add new benchmarks:

1. Create new benchmark configuration in `standard-benchmarks.ts`
2. Add queries that test specific capabilities
3. Include appropriate domains and difficulty levels
4. Test with diverse API providers
5. Document expected outcomes and success criteria

## Support

- [ElizaOS Documentation](https://docs.eliza.ai)
- [Research Plugin Source](https://github.com/elizaos/eliza/tree/main/packages/plugin-research)
- [Issue Tracker](https://github.com/elizaos/eliza/issues)

---

*Generated by ElizaOS Research Plugin Benchmark Suite*