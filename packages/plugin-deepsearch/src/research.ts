import FirecrawlApp from '@mendable/firecrawl-js';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';
import { ModelType } from '@elizaos/core';

interface ResearchOptions {
  question: string;
  depth: number;
  breadth: number;
}

export interface ResearchResult {
  learnings: string[];
  visitedUrls: string[];
}

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

async function generateQueries(
  runtime: IAgentRuntime,
  question: string,
  breadth: number,
  learnings: string[],
): Promise<string[]> {
  const prompt = [
    `Generate ${breadth} diverse web search queries to research the question: "${question}".`,
    learnings.length
      ? `Previous notes:\n${learnings.join('\n')}`
      : '',
    'Return each query on a new line.',
  ].join('\n');
  const resp = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return resp
    .split('\n')
    .map(q => q.trim())
    .filter(Boolean)
    .slice(0, breadth);
}

async function summarizeContents(
  runtime: IAgentRuntime,
  query: string,
  contents: string[],
  max: number,
): Promise<string[]> {
  const joined = contents.join('\n');
  const prompt = `Summarize the following documents for query "${query}". Return up to ${max} bullet points.\n${joined}`;
  const resp = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return resp
    .split('\n')
    .map(l => l.replace(/^[-*\d\.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function deepResearch(
  runtime: IAgentRuntime,
  opts: ResearchOptions,
  callback?: HandlerCallback,
): Promise<ResearchResult> {
  let learnings: string[] = [];
  let visitedUrls: string[] = [];

  for (let i = 0; i < opts.depth; i++) {
    const queries = await generateQueries(runtime, opts.question, opts.breadth, learnings);

    for (const q of queries) {
      callback?.({ text: `<thinking>Searching for \"${q}\"</thinking>` });
      const res = await firecrawl.search(q, {
        limit: 5,
        scrapeOptions: { formats: ['markdown'] },
      });
      const urls = res.data.map(d => d.url).filter(Boolean) as string[];
      visitedUrls.push(...urls);
      const contents = res.data.map(d => d.markdown).filter(Boolean) as string[];
      callback?.({ text: `<thinking>Reading results for \"${q}\"</thinking>` });
      const notes = await summarizeContents(runtime, q, contents, opts.breadth);
      learnings.push(...notes);
    }
  }
  // deduplicate
  learnings = Array.from(new Set(learnings));
  visitedUrls = Array.from(new Set(visitedUrls));
  return { learnings, visitedUrls };
}
