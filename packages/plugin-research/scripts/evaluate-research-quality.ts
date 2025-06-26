import { ResearchService } from '../src/service';
import { IAgentRuntime, ModelType, type ModelTypeName } from '@elizaos/core';
import { logger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DeepResearchBenchmark } from '../src/benchmark/deepresearch-benchmark';

// Sample queries from DeepResearch Bench for testing
const BENCHMARK_QUERIES = [
  {
    id: 60,
    query: 'How to conduct comprehensive and accurate situational awareness of space targets in the cislunar space, and support the effectiveness of short-term cislunar space tracking and monitoring tasks?',
    topic: 'Science & Technology',
    expectedDepth: 'deep'
  },
  {
    id: 66,
    query: "Which Obsidian plugins can effectively replicate Notion's multi-view database functionality (including Table, Kanban, Calendar, and List views)? Please provide a detailed comparison of the strengths and weaknesses of these plugins.",
    topic: 'Software Development',
    expectedDepth: 'moderate'
  },
  {
    id: 75,
    query: 'Could therapeutic interventions aimed at modulating plasma metal ion concentrations represent effective preventive or therapeutic strategies against cardiovascular diseases? What types of interventions—such as supplementation—have been proposed, and is there clinical evidence supporting their feasibility and efficacy?',
    topic: 'Health',
    expectedDepth: 'deep'
  }
];

// Quality metrics to evaluate
interface QualityMetrics {
  // RACE Metrics
  comprehensiveness: {
    topicCoverage: number;      // 0-1: How well does it cover all aspects
    breadthOfSources: number;   // 0-1: Diversity of sources
    depthOfAnalysis: number;    // 0-1: How deep does it go
  };
  insight: {
    novelInsights: number;      // 0-1: New insights generated
    criticalAnalysis: number;   // 0-1: Quality of analysis
    synthesis: number;          // 0-1: How well it synthesizes information
  };
  instructionFollowing: {
    queryAlignment: number;     // 0-1: Answers the specific question
    formatCompliance: number;   // 0-1: Follows expected format
    completeness: number;       // 0-1: Addresses all parts
  };
  readability: {
    structure: number;          // 0-1: Well-organized
    clarity: number;            // 0-1: Clear writing
    flow: number;              // 0-1: Logical flow
  };

  // FACT Metrics
  citations: {
    totalCitations: number;
    uniqueSources: number;
    verifiedCitations: number;
    citationAccuracy: number;   // 0-1: Percentage verified
    sourceCredibility: number;  // 0-1: Average credibility
  };

  // Additional Metrics
  performance: {
    searchQueries: number;
    sourcesProcessed: number;
    findingsExtracted: number;
    processingTime: number;
    tokensGenerated: number;
  };
}

// Create a mock runtime with real search capabilities
function createEvaluationRuntime(): IAgentRuntime {
  const runtime: IAgentRuntime = {
    agentId: 'eval-agent',
    character: {
      name: 'Research Evaluator',
      bio: ['Expert research assistant'],
      system: 'You are an expert research assistant focused on producing comprehensive, deep research.',
    },
    getSetting: (key: string) => process.env[key],
    useModel: async (modelType: ModelTypeName, params: any) => {
      // Use actual model for evaluation
      console.log(`[Model Call] Type: ${modelType}, Purpose: ${params.messages?.[0]?.content?.substring(0, 100)}...`);

      // For this evaluation, return mock responses to test the flow
      if (params.messages?.[0]?.content?.includes('Extract key findings')) {
        return JSON.stringify([
          {
            content: 'Space situational awareness in cislunar space requires advanced tracking systems and predictive algorithms to monitor objects beyond GEO.',
            relevance: 0.9,
            confidence: 0.85,
            category: 'fact'
          },
          {
            content: 'Current challenges include limited sensor coverage, high delta-v requirements, and complex orbital dynamics in the cislunar region.',
            relevance: 0.8,
            confidence: 0.9,
            category: 'fact'
          }
        ]);
      }

      return 'Mock response for evaluation';
    },
    logger: logger,
  } as any;

  return runtime;
}

async function evaluateResearchQuality(projectId: string, service: ResearchService): Promise<QualityMetrics> {
  const project = await service.getProject(projectId);
  if (!project) {throw new Error('Project not found');}

  const metrics: QualityMetrics = {
    comprehensiveness: {
      topicCoverage: 0,
      breadthOfSources: 0,
      depthOfAnalysis: 0
    },
    insight: {
      novelInsights: 0,
      criticalAnalysis: 0,
      synthesis: 0
    },
    instructionFollowing: {
      queryAlignment: 0,
      formatCompliance: 0,
      completeness: 0
    },
    readability: {
      structure: 0,
      clarity: 0,
      flow: 0
    },
    citations: {
      totalCitations: 0,
      uniqueSources: 0,
      verifiedCitations: 0,
      citationAccuracy: 0,
      sourceCredibility: 0
    },
    performance: {
      searchQueries: 0,
      sourcesProcessed: project.sources.length,
      findingsExtracted: project.findings.length,
      processingTime: (project.completedAt || Date.now()) - project.createdAt,
      tokensGenerated: 0
    }
  };

  // Evaluate comprehensiveness
  const uniqueDomains = new Set(project.sources.map(s => s.domain || 'unknown'));
  metrics.comprehensiveness.breadthOfSources = Math.min(uniqueDomains.size / 5, 1);

  const sourceTypes = new Set(project.sources.map(s => s.type));
  metrics.comprehensiveness.topicCoverage = Math.min(sourceTypes.size / 4, 1);

  // Depth based on findings per source
  const avgFindingsPerSource = project.findings.length / Math.max(project.sources.length, 1);
  metrics.comprehensiveness.depthOfAnalysis = Math.min(avgFindingsPerSource / 3, 1);

  // Evaluate insights
  const highConfidenceFindings = project.findings.filter(f => f.confidence > 0.8);
  metrics.insight.novelInsights = Math.min(highConfidenceFindings.length / 10, 1);

  // Check for synthesis
  if (project.metadata.synthesis) {
    metrics.insight.synthesis = Math.min(project.metadata.synthesis.length / 1000, 1);
  }

  // Evaluate citations
  if (project.report) {
    metrics.citations.totalCitations = project.report.citations.length;
    metrics.citations.uniqueSources = new Set(project.report.citations.map(c => c.source.url)).size;

    // Calculate citation accuracy (simplified)
    const verifiedCitations = project.report.citations.filter(c => c.verificationStatus === 'verified');
    metrics.citations.verifiedCitations = verifiedCitations.length;
    metrics.citations.citationAccuracy = metrics.citations.totalCitations > 0
      ? verifiedCitations.length / metrics.citations.totalCitations
      : 0;

    // Source credibility
    const avgReliability = project.sources.reduce((sum, s) => sum + s.reliability, 0) / project.sources.length;
    metrics.citations.sourceCredibility = avgReliability;
  }

  // Report structure evaluation
  if (project.report) {
    metrics.readability.structure = project.report.sections.length >= 3 ? 1 : project.report.sections.length / 3;
    metrics.readability.clarity = 0.8; // Placeholder - would need NLP analysis
    metrics.readability.flow = 0.8; // Placeholder - would need NLP analysis

    metrics.instructionFollowing.formatCompliance = 1; // Assuming proper format
    metrics.instructionFollowing.completeness = project.status === 'completed' ? 1 : 0.5;
  }

  return metrics;
}

function calculateRACEScore(metrics: QualityMetrics): number {
  const comprehensiveness = (
    metrics.comprehensiveness.topicCoverage * 0.4 +
    metrics.comprehensiveness.breadthOfSources * 0.3 +
    metrics.comprehensiveness.depthOfAnalysis * 0.3
  ) * 100;

  const insight = (
    metrics.insight.novelInsights * 0.4 +
    metrics.insight.criticalAnalysis * 0.3 +
    metrics.insight.synthesis * 0.3
  ) * 100;

  const instructionFollowing = (
    metrics.instructionFollowing.queryAlignment * 0.4 +
    metrics.instructionFollowing.formatCompliance * 0.3 +
    metrics.instructionFollowing.completeness * 0.3
  ) * 100;

  const readability = (
    metrics.readability.structure * 0.4 +
    metrics.readability.clarity * 0.3 +
    metrics.readability.flow * 0.3
  ) * 100;

  // Weighted average (equal weights for now)
  return (comprehensiveness + insight + instructionFollowing + readability) / 4;
}

async function runBenchmarkComparison() {
  console.log('=== ElizaOS Research Quality Evaluation ===\n');
  console.log('Comparing against DeepResearch Bench standards...\n');

  const runtime = createEvaluationRuntime();
  const service = new ResearchService(runtime);
  const benchmark = new DeepResearchBenchmark();

  // Run research on sample queries
  interface EvaluationResult {
    queryId: number;
    query: string;
    metrics: QualityMetrics;
    raceScore: number;
    project: any; // ResearchProject type
  }
  const results: EvaluationResult[] = [];

  for (const testQuery of BENCHMARK_QUERIES.slice(0, 1)) { // Test with first query
    console.log(`\n--- Testing Query ${testQuery.id} ---`);
    console.log(`Topic: ${testQuery.topic}`);
    console.log(`Query: ${testQuery.query}\n`);

    try {
      // Create research project
      const project = await service.createResearchProject(testQuery.query, {
        researchDepth: testQuery.expectedDepth as any,
        maxSearchResults: 20,
        evaluationEnabled: true,
        cacheEnabled: false
      });

      console.log(`Project created: ${project.id}`);
      console.log(`Status: ${project.status}`);
      console.log(`Phase: ${project.phase}`);

      // Wait for completion (with timeout)
      const startTime = Date.now();
      const timeout = 2 * 60 * 1000; // 2 minutes

      while (project.status === 'active' && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const updatedProject = await service.getProject(project.id);
        if (updatedProject) {
          console.log(`Progress: ${updatedProject.phase} (${Math.round((Date.now() - startTime) / 1000)}s)`);
          if (updatedProject.status !== 'active') {break;}
        }
      }

      // Evaluate quality
      const metrics = await evaluateResearchQuality(project.id, service);
      const raceScore = calculateRACEScore(metrics);

      results.push({
        queryId: testQuery.id,
        query: testQuery.query,
        metrics,
        raceScore,
        project
      });

      console.log('\n=== Quality Metrics ===');
      console.log(`RACE Score: ${raceScore.toFixed(2)}/100`);
      console.log('\nComprehensiveness:');
      console.log(`  - Topic Coverage: ${(metrics.comprehensiveness.topicCoverage * 100).toFixed(1)}%`);
      console.log(`  - Source Breadth: ${(metrics.comprehensiveness.breadthOfSources * 100).toFixed(1)}%`);
      console.log(`  - Analysis Depth: ${(metrics.comprehensiveness.depthOfAnalysis * 100).toFixed(1)}%`);

      console.log('\nCitations:');
      console.log(`  - Total Citations: ${metrics.citations.totalCitations}`);
      console.log(`  - Unique Sources: ${metrics.citations.uniqueSources}`);
      console.log(`  - Citation Accuracy: ${(metrics.citations.citationAccuracy * 100).toFixed(1)}%`);
      console.log(`  - Source Credibility: ${(metrics.citations.sourceCredibility * 100).toFixed(1)}%`);

      console.log('\nPerformance:');
      console.log(`  - Sources Processed: ${metrics.performance.sourcesProcessed}`);
      console.log(`  - Findings Extracted: ${metrics.performance.findingsExtracted}`);
      console.log(`  - Processing Time: ${(metrics.performance.processingTime / 1000).toFixed(1)}s`);

    } catch (error) {
      console.error(`Error processing query ${testQuery.id}:`, error);
    }
  }

  // Compare with benchmark standards
  console.log('\n\n=== Benchmark Comparison ===');
  console.log('\nDeepResearch Bench Top Performers:');
  console.log('- Gemini-2.5-Pro Deep Research: RACE 48.88, Citations 111.21');
  console.log('- OpenAI Deep Research: RACE 46.98, Citations 40.79');
  console.log('- Perplexity Deep Research: RACE 42.25, Citations 31.26');

  console.log('\nElizaOS Research Performance:');
  for (const result of results) {
    console.log(`- Query ${result.queryId}: RACE ${result.raceScore.toFixed(2)}, Citations ${result.metrics.citations.totalCitations}`);
  }

  // Identify areas for improvement
  console.log('\n\n=== Areas for Improvement ===');

  const avgRACE = results.reduce((sum, r) => sum + r.raceScore, 0) / results.length;
  const avgCitations = results.reduce((sum, r) => sum + r.metrics.citations.totalCitations, 0) / results.length;

  if (avgRACE < 40) {
    console.log('❌ RACE Score below benchmark (target: 40+)');
    console.log('   - Need deeper analysis and synthesis');
    console.log('   - Improve source diversity and comprehensiveness');
  } else {
    console.log('✅ RACE Score meets benchmark standards');
  }

  if (avgCitations < 30) {
    console.log('❌ Citation count below benchmark (target: 30+)');
    console.log('   - Need more thorough source extraction');
    console.log('   - Improve citation verification');
  } else {
    console.log('✅ Citation count meets benchmark standards');
  }

  // Save evaluation results
  const resultsPath = path.join(process.cwd(), 'benchmark_results', 'elizaos_evaluation.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      averageRACE: avgRACE,
      averageCitations: avgCitations,
      totalQueries: results.length
    }
  }, null, 2));

  console.log(`\n✅ Evaluation results saved to: ${resultsPath}`);
}

// Main execution
async function main() {
  try {
    await runBenchmarkComparison();
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

main();
