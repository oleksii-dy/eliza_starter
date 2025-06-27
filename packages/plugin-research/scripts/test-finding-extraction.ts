import { IAgentRuntime, ModelType, type ModelTypeName } from '@elizaos/core';
import { ResearchService } from '../src/service';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Mock runtime for testing
const mockRuntime: IAgentRuntime = {
  agentId: 'test-agent',
  character: {
    name: 'Test Agent',
    bio: ['Test bio'],
    system: 'Test system',
  },
  getSetting: (key: string) => process.env[key],
  useModel: async (modelType: ModelTypeName, params: any) => {
    console.log('Mock LLM called with:', {
      modelType,
      prompt: params.messages?.[1]?.content?.substring(0, 200),
    });

    // Test different response scenarios
    const query = params.messages?.[1]?.content || '';

    // Test 1: Valid findings
    if (query.includes('Space Situational Awareness')) {
      return JSON.stringify([
        {
          content:
            "Space Situational Awareness (SSA) involves tracking and monitoring objects in Earth's orbit to prevent collisions and ensure space safety.",
          relevance: 0.8,
          confidence: 0.9,
          category: 'fact',
        },
        {
          content:
            'The Aerospace Corporation provides advanced SSA capabilities through sensor networks and data analytics platforms.',
          relevance: 0.7,
          confidence: 0.85,
          category: 'fact',
        },
      ]);
    }

    // Test 2: Empty array response
    if (query.includes('Efficient Data Extraction')) {
      return '[]';
    }

    // Test 3: Invalid JSON
    if (query.includes('Invalid JSON Test')) {
      return 'This is not valid JSON';
    }

    // Default: return empty array
    return '[]';
  },
  logger: {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  },
} as any;

async function testFindingExtraction() {
  console.log('Testing finding extraction with content sanitization...\n');

  const service = new ResearchService(mockRuntime);

  // Test cases with different content types
  const testCases = [
    {
      name: 'HTML entities and special characters',
      source: {
        id: '1',
        url: 'https://aerospace.org/ssi-space-situational-awareness',
        title: 'Space Situational Awareness - Aerospace Corporation',
        snippet: 'SSA overview',
        reliability: 0.9,
        type: 'web' as const,
      },
      content: `
        <h1>Space Situational Awareness &amp; Safety</h1>
        <p>The Aerospace Corporation&rsquo;s SSA capabilities include:</p>
        <ul>
          <li>&bull; Advanced sensor networks &ndash; tracking 50,000+ objects</li>
          <li>&bull; Data analytics &amp; machine learning</li>
          <li>&bull; Collision prediction &hellip; and more</li>
        </ul>
        <p>Visit https://aerospace.org/space for more info&trade;</p>
        <script>alert('test')</script>
      `,
    },
    {
      name: 'Valid content that should extract findings',
      source: {
        id: '2',
        url: 'https://example.com/ssa',
        title: 'Space Situational Awareness Overview',
        snippet: 'Comprehensive SSA guide',
        reliability: 0.8,
        type: 'web' as const,
      },
      content: `
        Space Situational Awareness (SSA) is critical for modern space operations.
        It involves tracking objects in orbit, predicting collisions, and ensuring
        the safety of spacecraft. Key components include ground-based sensors,
        space-based sensors, and advanced data processing systems.
      `,
    },
    {
      name: 'Content that returns empty findings',
      source: {
        id: '3',
        url: 'https://tdan.com/efficient-data-extraction',
        title: 'Efficient Data Extraction Techniques for Large Datasets',
        snippet: 'Data extraction methods',
        reliability: 0.7,
        type: 'web' as const,
      },
      content: `
        This article discusses efficient data extraction techniques.
        Topics include ETL pipelines, data warehousing, and optimization.
      `,
    },
    {
      name: 'Short content that should use fallback',
      source: {
        id: '4',
        url: 'https://example.com/short',
        title: 'Short Article',
        snippet: 'This is a very short article snippet with limited content.',
        reliability: 0.6,
        type: 'web' as const,
      },
      content: 'Too short',
    },
  ];

  // Create a test project
  const project = {
    id: 'test-project',
    query: 'space situational awareness data extraction',
    sources: [],
    findings: [],
    status: 'active' as const,
    phase: 'analysis' as const,
    metadata: {
      domain: 'technology' as const,
      taskType: 'analytical' as const,
      depth: 'comprehensive' as const,
    },
  };

  // Test each case
  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log(`Source: ${testCase.source.title}`);
    console.log(`URL: ${testCase.source.url}`);
    console.log(`Content length: ${testCase.content.length} chars`);

    try {
      // Call the private method through the service (in real usage this would be internal)
      const findings = await (service as any).extractFindingsWithRelevance(
        testCase.source,
        project.query,
        testCase.content,
        {
          queryIntent:
            'Research space situational awareness and data extraction',
          keyTopics: ['SSA', 'data'],
        }
      );

      console.log(`\nFindings extracted: ${findings.length}`);
      findings.forEach((finding: any, index: number) => {
        console.log(`\nFinding ${index + 1}:`);
        console.log(`- Content: ${finding.content.substring(0, 100)}...`);
        console.log(`- Relevance: ${finding.relevance}`);
        console.log(`- Confidence: ${finding.confidence}`);
        console.log(`- Category: ${finding.category}`);
      });
    } catch (error) {
      console.error('Error during extraction:', error);
    }
  }

  console.log('\n\n--- Content Sanitization Test ---');

  // Test the sanitization function directly
  const contentWithIssues = `
    <p>This &amp; that &ndash; testing &hellip;</p>
    <script>alert('bad')</script>
    https://example.com/test-url
    Multiple     spaces     and
    
    
    too many newlines
    Special chars: \x00\x1F
    Excessive punctuation!!!!!!!!!
  `;

  const sanitized = (service as any).sanitizeContentForLLM(contentWithIssues);
  console.log('Original length:', contentWithIssues.length);
  console.log('Sanitized length:', sanitized.length);
  console.log('\nSanitized content:');
  console.log(sanitized);
}

// Run the test
testFindingExtraction().catch(console.error);
