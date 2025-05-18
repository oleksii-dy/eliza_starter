import {
  composePrompt,
  parseJSONObjectFromText,
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  ModelType,
  MemoryType,
  logger,
} from '@elizaos/core';

const summaryTemplate = `Summarize the RSS feed item below and decide if it warrants further research. Reply in JSON with {"summary": string, "interesting": boolean}.
Title: {{title}}
Link: {{url}}`;

async function handler(runtime: IAgentRuntime, message: Memory) {
  const prompt = composePrompt({
    state: { title: message.content.text ?? '', url: message.content.url ?? '' },
    template: summaryTemplate,
  });

  try {
    const result = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    const data = parseJSONObjectFromText(result) as
      | { summary?: string; interesting?: boolean }
      | null;
    if (!data) return;

    const summary = data.summary ?? '';
    const interesting = data.interesting === true;

    const summaryMemory: Memory = {
      entityId: message.entityId,
      agentId: runtime.agentId,
      roomId: message.roomId,
      worldId: message.worldId,
      content: { text: summary, source: 'rss', url: message.content.url },
      metadata: { type: MemoryType.DESCRIPTION, source: 'rss_summary' },
    };
    await runtime.createMemory(summaryMemory, 'documents');

    if (interesting) {
      await runtime.createMemory(
        {
          entityId: message.entityId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          worldId: message.worldId,
          content: {
            text: `Fetch more info from ${message.content.url}`,
            source: 'rss_followup',
          },
          metadata: { type: MemoryType.CUSTOM, source: 'rss_followup' },
        },
        'documents',
      );
    }
  } catch (error) {
    logger.error('RSS evaluator error', error);
  }
}

export const rssInterestEvaluator: Evaluator = {
  name: 'RSS_SUMMARY',
  description:
    'Summarizes RSS items and flags interesting ones for further research',
  validate: async (_runtime: IAgentRuntime, message: Memory) =>
    message.content?.source === 'rss',
  handler,
};
