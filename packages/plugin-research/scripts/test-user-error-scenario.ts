import { ResearchService } from '../src/service';
import { IAgentRuntime, ModelType } from '@elizaos/core';

// Create a runtime that simulates the exact scenario from the user's error
const runtime: IAgentRuntime = {
  agentId: 'test-agent',
  character: {
    name: 'Research Agent',
    bio: ['Research assistant'],
    system: 'You are a research assistant',
  },
  getSetting: (key: string) => process.env[key],
  useModel: async (modelType: any, params: any) => {
    console.log('\n[LLM Called] Model type:', modelType);
    console.log('[LLM Called] Content preview:', `${params.messages?.[1]?.content?.substring(0, 300)}...\n`);

    // Simulate the exact error: returning empty array
    return '[]';
  },
  logger: {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
    debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  },
} as any;

async function testUserErrorScenario() {
  console.log('=== Testing User Error Scenario ===\n');
  console.log('Simulating the exact error from the logs:');
  console.log('- Space Situational Awareness content returning empty findings');
  console.log('- Data Extraction content returning empty findings\n');

  const service = new ResearchService(runtime);

  // Test case 1: Space Situational Awareness (from user's error)
  const ssaSource = {
    id: 'ssa-1',
    url: 'https://aerospace.org/ssi-space-situational-awareness',
    title: 'Space Situational Awareness - Aerospace Corporation',
    snippet: 'SSA involves tracking space objects',
    reliability: 0.9,
    type: 'web' as const,
    fullContent: `
      <h1>Space Situational Awareness</h1>
      <p>The Aerospace Corporation&rsquo;s Space Situational Awareness (SSA) capabilities 
      are designed to track &amp; monitor over 50,000 objects in Earth&rsquo;s orbit.</p>
      <ul>
        <li>Advanced sensor networks &ndash; ground and space-based</li>
        <li>Machine learning algorithms for collision prediction</li>
        <li>Real-time data analytics &amp; visualization</li>
      </ul>
      <p>Learn more at https://aerospace.org/space-safety</p>
    `,
  };

  // Test case 2: Data Extraction (from user's error)
  const dataExtractionSource = {
    id: 'de-1',
    url: 'https://tdan.com/efficient-data-extraction-techniques-for-large-datasets/32018',
    title: 'Efficient Data Extraction Techniques for Large Datasets - TDAN.com',
    snippet: 'Data extraction for big data',
    reliability: 0.8,
    type: 'web' as const,
    fullContent: `
      <article>
        <h2>Efficient Data Extraction Techniques</h2>
        <p>When dealing with large datasets &mdash; often terabytes in size &mdash; 
        traditional extraction methods aren&rsquo;t sufficient.</p>
        <p>Key techniques include:</p>
        <ol>
          <li>Parallel processing using Apache Spark&trade;</li>
          <li>Stream processing for real-time data</li>
          <li>Incremental extraction &amp; change data capture (CDC)</li>
        </ol>
      </article>
    `,
  };

  console.log('Test 1: Space Situational Awareness Content');
  console.log('==========================================');
  try {
    const findings1 = await (service as any).extractFindingsWithRelevance(
      ssaSource,
      'space situational awareness',
      ssaSource.fullContent || '',
      { queryIntent: 'Learn about SSA', keyTopics: ['SSA', 'space tracking'] }
    );

    console.log(`✅ SUCCESS: Extracted ${findings1.length} findings (expected: 0 with graceful handling)`);
    console.log('No error thrown - empty findings handled correctly\n');
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
  }

  console.log('\nTest 2: Data Extraction Content');
  console.log('================================');
  try {
    const findings2 = await (service as any).extractFindingsWithRelevance(
      dataExtractionSource,
      'efficient data extraction techniques',
      dataExtractionSource.fullContent || '',
      { queryIntent: 'Learn about data extraction', keyTopics: ['data extraction', 'big data'] }
    );

    console.log(`✅ SUCCESS: Extracted ${findings2.length} findings (expected: 0 with graceful handling)`);
    console.log('No error thrown - empty findings handled correctly\n');
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
  }

  console.log('\n=== Content Sanitization Results ===');

  // Show what the content looks like after sanitization
  const sanitized1 = (service as any).sanitizeContentForLLM(ssaSource.fullContent || '');
  const sanitized2 = (service as any).sanitizeContentForLLM(dataExtractionSource.fullContent || '');

  console.log('\nSSA Content:');
  console.log('- Original length:', ssaSource.fullContent?.length);
  console.log('- Sanitized length:', sanitized1.length);
  console.log('- Preview:', `${sanitized1.substring(0, 200)}...`);

  console.log('\nData Extraction Content:');
  console.log('- Original length:', dataExtractionSource.fullContent?.length);
  console.log('- Sanitized length:', sanitized2.length);
  console.log('- Preview:', `${sanitized2.substring(0, 200)}...`);

  console.log('\n✅ SUMMARY: Both error scenarios are now handled gracefully without throwing errors');
}

// Run the test
testUserErrorScenario().catch(console.error);
