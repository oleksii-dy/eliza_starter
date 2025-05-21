import type { IAgentRuntime, Memory, Provider } from '@elizaos/core';
import { addHeader, logger, ModelType } from '@elizaos/core';

/**
 * Determines if a text query is likely asking for factual information that would benefit from knowledge base access.
 *
 * @param {IAgentRuntime} runtime - The agent runtime instance.
 * @param {string} text - The text to analyze.
 * @returns {Promise<boolean>} True if the query likely needs knowledge base access.
 */
export async function isQuestionOrKnowledgeQuery(
  runtime: IAgentRuntime,
  text: string
): Promise<boolean> {
  if (!text) return false;

  const prompt = `
# Task: Analyze if this query requires accessing a knowledge base

Query: "${text}"

## Guidelines for Knowledge Base Access
A knowledge base should be accessed when a query is asking for:
1. Factual information or explanations (e.g., "How does X work?", "What is Y?")
2. Current events or recent updates (e.g., "What's new?", "What are the updates?")
3. Technical details or specifications (e.g., "What's the API for X?")
4. Historical information or context (e.g., "When did X happen?")
5. Comparisons requiring factual knowledge (e.g., "What's the difference between X and Y?")
6. Status updates about projects, features, or systems

A knowledge base is NOT needed when a query is:
1. Purely conversational (e.g., "How are you?")
2. Asking for personal opinions (e.g., "What do you think about X?")
3. Requesting actions (e.g., "Can you send this message?")
4. Simple greetings or farewells

A knowledge base is needed if you don't know the answer to that query return true

## Examples
- "What's the latest update on the project?" → TRUE (requires knowledge)
- "How are you doing today?" → FALSE (conversational)
- "Can you tell me about the new features?" → TRUE (requires knowledge)
- "Could you send this message for me?" → FALSE (action request)

Based on these guidelines, does the query require accessing a knowledge base?
Answer (true/false):`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    const normalizedResponse = response.trim().toLowerCase();

    // Accept variations of "true" answers
    return ['true', 'yes', 't', '1'].includes(normalizedResponse);
  } catch (error) {
    logger.warn('[Bootstrap] Error determining if query needs knowledge:', error);
    // Default to false on error to avoid unnecessary knowledge lookups
    return false;
  }
}

/**
 * Represents a knowledge provider that retrieves knowledge from the knowledge base.
 * @type {Provider}
 * @property {string} name - The name of the knowledge provider.
 * @property {string} description - The description of the knowledge provider.
 * @property {boolean} dynamic - Indicates if the knowledge provider is dynamic or static.
 * @property {Function} get - Asynchronously retrieves knowledge from the knowledge base.
 * @param {IAgentRuntime} runtime - The agent runtime object.
 * @param {Memory} message - The message containing the query for knowledge retrieval.
 * @returns {Object} An object containing the retrieved knowledge data, values, and text.
 */
export const knowledgeProvider: Provider = {
  name: 'KNOWLEDGE',
  description:
    'Knowledge from the knowledge base that the agent knows, retrieved whenever the agent needs to answer a question about their expertise.',
  dynamic: true,
  get: async (runtime: IAgentRuntime, message: Memory) => {
    const knowledgeData = await runtime.getKnowledge(message);

    const firstFiveKnowledgeItems = knowledgeData?.slice(0, 5);

    let knowledge =
      (firstFiveKnowledgeItems && firstFiveKnowledgeItems.length > 0
        ? addHeader(
            '# Knowledge',
            firstFiveKnowledgeItems.map((knowledge) => `- ${knowledge.content.text}`).join('\n')
          )
        : '') + '\n';

    const tokenLength = 3.5;

    if (knowledge.length > 4000 * tokenLength) {
      knowledge = knowledge.slice(0, 4000 * tokenLength);
    }

    return {
      data: {
        knowledge,
      },
      values: {
        knowledge,
      },
      text: knowledge,
    };
  },
};
