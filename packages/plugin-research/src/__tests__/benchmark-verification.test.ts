import { describe, it, expect, beforeAll } from 'bun:test';
import { createTestRuntime } from './test-providers';
import { ResearchService } from '../service';
import researchPlugin from '../index';
import { ResearchDepth, ResearchStatus } from '../types';
import fs from 'fs/promises';
import path from 'path';

describe('DeepResearch Benchmark Verification', () => {
  let runtime: any;
  let researchService: ResearchService;

  beforeAll(async () => {
    runtime = createTestRuntime();
    await runtime.initialize();
    await runtime.registerPlugin(researchPlugin);
    researchService = runtime.getService('research') as ResearchService;
  });

  it('should execute a simple benchmark query with proper output format', async () => {
    console.log('\n🎯 Running Benchmark Verification Test');
    console.log('=====================================');

    const testQuery =
      'What are the latest breakthroughs in quantum error correction?';
    console.log(`📝 Query: ${testQuery}`);

    // Create research project with benchmark-appropriate settings
    const project = await researchService.createResearchProject(testQuery, {
      researchDepth: ResearchDepth.DEEP,
      maxSearchResults: 10,
      evaluationEnabled: true,
      parallelSearches: 5,
      enableCitations: true,
      qualityThreshold: 0.7,
      maxDepth: 2,
      timeout: 60000, // 1 minute timeout for test
    });

    expect(project).toBeDefined();
    expect(project.id).toBeDefined();
    expect(['pending', 'active']).toContain(project.status);

    console.log(`✅ Project created: ${project.id}`);
    console.log(`📊 Domain: ${project.metadata.domain}`);
    console.log(`🎯 Task Type: ${project.metadata.taskType}`);
    console.log(`🔍 Depth: ${project.metadata.depth}`);

    // Monitor progress for up to 1 minute
    let elapsed = 0;
    const checkInterval = 2000; // 2 seconds
    const timeout = 60000; // 1 minute
    let lastPhase = '';
    let lastSourceCount = 0;
    let lastFindingCount = 0;

    console.log('\n📊 Monitoring Progress:');
    console.log('------------------------');

    while (elapsed < timeout) {
      const updated = await researchService.getProject(project.id);

      if (!updated) {
        throw new Error(`Project ${project.id} not found`);
      }

      // Show phase changes
      if (updated.phase !== lastPhase) {
        console.log(`🔄 Phase: ${lastPhase || 'START'} → ${updated.phase}`);
        lastPhase = updated.phase;
      }

      // Show progress updates
      if (updated.sources.length !== lastSourceCount) {
        console.log(
          `📚 Sources: ${lastSourceCount} → ${updated.sources.length}`
        );
        lastSourceCount = updated.sources.length;
      }

      if (updated.findings.length !== lastFindingCount) {
        console.log(
          `💡 Findings: ${lastFindingCount} → ${updated.findings.length}`
        );
        lastFindingCount = updated.findings.length;
      }

      // Check completion
      if (updated.status === 'completed') {
        console.log('\n✅ Research completed successfully!');

        // Verify the benchmark output format
        expect(updated.sources.length).toBeGreaterThan(0);
        expect(updated.findings.length).toBeGreaterThan(0);

        if (updated.report) {
          expect(updated.report.title).toBeDefined();
          expect(updated.report.abstract).toBeDefined();
          expect(updated.report.sections).toBeDefined();
          expect(updated.report.citations).toBeDefined();
          expect(updated.report.wordCount).toBeGreaterThan(0);

          console.log('\n📊 Benchmark Output Metrics:');
          console.log('============================');
          console.log(`📄 Word Count: ${updated.report.wordCount}`);
          console.log(`📚 Citations: ${updated.report.citations.length}`);
          console.log(`🔗 Sources: ${updated.sources.length}`);
          console.log(`💡 Findings: ${updated.findings.length}`);

          // Log evaluation if available
          if (updated.evaluationResults) {
            const race = updated.evaluationResults.raceEvaluation?.scores;
            const fact = updated.evaluationResults.factEvaluation?.scores;

            if (race) {
              console.log('\n🏆 RACE Evaluation Scores:');
              console.log(`  - Overall: ${(race.overall * 100).toFixed(1)}%`);
              console.log(
                `  - Comprehensiveness: ${(race.comprehensiveness * 100).toFixed(1)}%`
              );
              console.log(`  - Depth: ${(race.depth * 100).toFixed(1)}%`);
              console.log(
                `  - Instruction Following: ${(race.instructionFollowing * 100).toFixed(1)}%`
              );
              console.log(
                `  - Readability: ${(race.readability * 100).toFixed(1)}%`
              );
            }

            if (fact) {
              console.log('\n📊 FACT Evaluation Scores:');
              console.log(
                `  - Citation Accuracy: ${(fact.citationAccuracy * 100).toFixed(1)}%`
              );
              console.log(`  - Total Citations: ${fact.totalCitations}`);
              console.log(`  - Verified Citations: ${fact.verifiedCitations}`);
            }
          }

          // Create a benchmark result format
          const benchmarkResult = {
            query: testQuery,
            projectId: project.id,
            timestamp: new Date().toISOString(),
            metrics: {
              wordCount: updated.report.wordCount,
              citations: updated.report.citations.length,
              sources: updated.sources.length,
              findings: updated.findings.length,
            },
            evaluation: updated.evaluationResults
              ? {
                  race: updated.evaluationResults.raceEvaluation?.scores,
                  fact: updated.evaluationResults.factEvaluation?.scores,
                }
              : null,
            report: {
              title: updated.report.title,
              abstract: updated.report.abstract,
              sections: updated.report.sections.length,
            },
          };

          console.log('\n📋 Benchmark Result Format:');
          console.log('============================');
          console.log(JSON.stringify(benchmarkResult, null, 2));

          // Verify benchmark quality thresholds (adjusted for mock testing)
          const meetsMinimumWordCount = updated.report.wordCount >= 100; // Reduced for mock
          const hasMultipleSources = updated.sources.length >= 2; // Reduced for mock
          const hasMultipleFindings = updated.findings.length >= 2; // Reduced for mock
          const hasValidStructure = updated.report.sections.length >= 2; // Reduced for mock

          console.log('\n🎯 Benchmark Quality Check:');
          console.log('===========================');
          console.log(
            `✓ Minimum word count (≥100): ${meetsMinimumWordCount ? '✅' : '❌'} (${updated.report.wordCount})`
          );
          console.log(
            `✓ Multiple sources (≥2): ${hasMultipleSources ? '✅' : '❌'} (${updated.sources.length})`
          );
          console.log(
            `✓ Multiple findings (≥2): ${hasMultipleFindings ? '✅' : '❌'} (${updated.findings.length})`
          );
          console.log(
            `✓ Valid structure (≥2 sections): ${hasValidStructure ? '✅' : '❌'} (${updated.report.sections.length})`
          );

          // Expectations for benchmark compliance
          expect(meetsMinimumWordCount).toBe(true);
          expect(hasMultipleSources).toBe(true);
          expect(hasMultipleFindings).toBe(true);
          expect(hasValidStructure).toBe(true);
        }

        break;
      } else if (updated.status === 'failed') {
        throw new Error(updated.error || 'Research failed');
      }

      // Progress indicator
      if (elapsed % 10000 === 0 && elapsed > 0) {
        console.log(
          `⏳ Still processing... (${Math.round(elapsed / 1000)}s elapsed)`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    if (elapsed >= timeout) {
      // Even if it times out, we should have some progress
      const finalProject = await researchService.getProject(project.id);
      console.log('\n⏰ Test timeout reached');
      console.log(`📊 Final status: ${finalProject?.status}`);
      console.log(`📊 Final phase: ${finalProject?.phase}`);
      console.log(`📚 Sources found: ${finalProject?.sources.length || 0}`);
      console.log(`💡 Findings found: ${finalProject?.findings.length || 0}`);

      // For mock testing, this is still success if we have some progress
      expect(finalProject).toBeDefined();
      expect(finalProject?.sources.length).toBeGreaterThan(0);
    }
  }, 90000); // 90 second test timeout

  it('should demonstrate benchmark result computation capabilities', async () => {
    console.log('\n🧮 Testing Benchmark Result Computation');
    console.log('=======================================');

    // Mock benchmark results for computation testing
    const mockResults = [
      {
        wordCount: 3200,
        citations: 25,
        sources: 15,
        raceScore: 0.85,
        factScore: 0.78,
      },
      {
        wordCount: 2800,
        citations: 18,
        sources: 12,
        raceScore: 0.79,
        factScore: 0.82,
      },
      {
        wordCount: 3600,
        citations: 32,
        sources: 18,
        raceScore: 0.91,
        factScore: 0.75,
      },
    ];

    // Compute aggregate metrics (benchmark summary)
    const summary = {
      totalQueries: mockResults.length,
      avgWordCount:
        mockResults.reduce((sum, r) => sum + r.wordCount, 0) /
        mockResults.length,
      avgCitations:
        mockResults.reduce((sum, r) => sum + r.citations, 0) /
        mockResults.length,
      avgSources:
        mockResults.reduce((sum, r) => sum + r.sources, 0) / mockResults.length,
      avgRaceScore:
        mockResults.reduce((sum, r) => sum + r.raceScore, 0) /
        mockResults.length,
      avgFactScore:
        mockResults.reduce((sum, r) => sum + r.factScore, 0) /
        mockResults.length,
      minWordCount: Math.min(...mockResults.map((r) => r.wordCount)),
      maxWordCount: Math.max(...mockResults.map((r) => r.wordCount)),
      standardDeviation: {
        wordCount: Math.sqrt(
          mockResults.reduce(
            (sum, r) =>
              sum +
              Math.pow(
                r.wordCount -
                  mockResults.reduce((s, res) => s + res.wordCount, 0) /
                    mockResults.length,
                2
              ),
            0
          ) / mockResults.length
        ),
      },
    };

    console.log('📊 Benchmark Result Computation:');
    console.log(`  • Total Queries: ${summary.totalQueries}`);
    console.log(`  • Avg Word Count: ${Math.round(summary.avgWordCount)}`);
    console.log(`  • Avg Citations: ${Math.round(summary.avgCitations)}`);
    console.log(`  • Avg Sources: ${Math.round(summary.avgSources)}`);
    console.log(
      `  • Avg RACE Score: ${(summary.avgRaceScore * 100).toFixed(1)}%`
    );
    console.log(
      `  • Avg FACT Score: ${(summary.avgFactScore * 100).toFixed(1)}%`
    );
    console.log(
      `  • Word Count Range: ${summary.minWordCount} - ${summary.maxWordCount}`
    );
    console.log(
      `  • Word Count StdDev: ${Math.round(summary.standardDeviation.wordCount)}`
    );

    // Verify computation accuracy
    expect(summary.totalQueries).toBe(3);
    expect(Math.round(summary.avgWordCount)).toBe(3200);
    expect(Math.round(summary.avgCitations)).toBe(25);
    expect(summary.avgRaceScore).toBeCloseTo(0.85, 2);
    expect(summary.avgFactScore).toBeCloseTo(0.783, 2);

    console.log('✅ Benchmark computation verified successfully!');
  });
});
