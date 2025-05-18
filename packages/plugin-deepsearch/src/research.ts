import type { IAgentRuntime, HandlerCallback, Memory, Provider, State } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs

// The actual name of the search provider as defined in its registration
const FIRECRAWL_SEARCH_PROVIDER_NAME = 'firecrawlSearch';

interface ResearchOptions {
  question: string;
  depth: number;
  breadth: number;
}

export interface ResearchResult {
  learnings: string[];
  visitedUrls: string[];
}

// Helper to create a Memory-like object that satisfies the Memory type for provider calls.
function createMinimalQueryMemory(queryText: string): Memory {
  const newUuid = uuidv4();
  const timestamp = Date.now();
  return {
    content: { text: queryText },
    id: newUuid,
    agentId: newUuid,
    entityId: newUuid,
    roomId: newUuid,
    type: 'INTERNAL_QUERY',
    metadata: { type: 'custom', source: 'deepsearch-internal-research' }, // Added type property
    createdAt: timestamp, // Use number timestamp
    updatedAt: timestamp, // Use number timestamp
  } as Memory;
}

// Helper to create a minimal State object for provider calls
function createMinimalState(): State {
  return {
    values: {},
    data: {},
    text: '',
  };
}

async function generateQueries(
  runtime: IAgentRuntime,
  question: string,
  breadth: number,
  learnings: string[]
): Promise<string[]> {
  const prompt = [
    `Generate ${breadth} diverse web search queries to research the question: "${question}".`,
    learnings.length ? `Previous notes:\n${learnings.join('\n')}` : '',
    'Return each query on a new line.',
  ].join('\n');
  const resp = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return resp
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, breadth);
}

async function summarizeContents(
  runtime: IAgentRuntime,
  query: string,
  contents: string[],
  max: number
): Promise<string[]> {
  const joined = contents.join('\n');
  const prompt = `Summarize the following documents for query "${query}". Return up to ${max} bullet points.\n${joined}`;
  const resp = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return resp
    .split('\n')
    .map((l) => l.replace(/^[-\*\d\.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function deepResearch(
  runtime: IAgentRuntime,
  opts: ResearchOptions,
  callback?: HandlerCallback
): Promise<ResearchResult> {
  let learnings: string[] = [];
  let visitedUrls: string[] = [];

  const searchP = runtime.providers?.find((p) => p.name === FIRECRAWL_SEARCH_PROVIDER_NAME);

  if (!searchP) {
    throw new Error(
      `Provider '${FIRECRAWL_SEARCH_PROVIDER_NAME}' not found in runtime. Ensure it's registered in the plugin.`
    );
  }

  const minimalState = createMinimalState();

  for (let i = 0; i < opts.depth; i++) {
    const queries = await generateQueries(runtime, opts.question, opts.breadth, learnings);

    for (const q of queries) {
      callback?.({ text: `<thinking>Searching for "${q}"</thinking>` });

      const searchQueryMemory = createMinimalQueryMemory(q);
      const searchResult = await (searchP as Provider).get(
        runtime,
        searchQueryMemory,
        minimalState
      );

      const resultsData =
        (searchResult.data as Array<{ url: string; markdown?: string; [key: string]: any }>) || [];

      const urls = resultsData.map((d) => d.url).filter(Boolean);
      visitedUrls.push(...urls);

      const contents = resultsData.map((d) => d.markdown).filter(Boolean) as string[];

      if (contents.length > 0) {
        callback?.({
          text: `<thinking>Reading ${contents.length} result(s) for "${q}"</thinking>`,
        });
        const notes = await summarizeContents(runtime, q, contents, opts.breadth);
        learnings.push(...notes);
      } else {
        callback?.({ text: `<thinking>No content to read for "${q}"</thinking>` });
      }
    }
  }
  learnings = Array.from(new Set(learnings));
  visitedUrls = Array.from(new Set(visitedUrls));
  return { learnings, visitedUrls };
}
