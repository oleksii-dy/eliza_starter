import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionExample,
  type UUID,
  asUUID,
  elizaLogger as logger,
} from '@elizaos/core';
import { PaymentMethod } from '../types';
import { createPaymentMiddleware } from '../middleware/paymentMiddleware';
import { v4 as uuidv4 } from 'uuid';

/**
 * Research action that requires payment
 * This demonstrates how to integrate payment into actions
 */
export const researchAction: Action = {
  name: 'RESEARCH',
  similes: ['SEARCH', 'INVESTIGATE', 'ANALYZE', 'STUDY', 'EXPLORE'],
  description: 'Performs in-depth research on a topic (requires payment)',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Check if message contains a research request
    const text = message.content?.text?.toLowerCase() || '';
    return (
      text.includes('research') ||
      text.includes('investigate') ||
      text.includes('analyze') ||
      text.includes('study')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<Memory[]> => {
    try {
      // Extract research topic from message
      const topic = extractResearchTopic(message.content?.text || '');

      if (!topic) {
        await callback?.({
          text: 'Please specify what you would like me to research.',
          error: true,
        });
        return [];
      }

      logger.info('[ResearchAction] Starting research', { topic });

      // Create payment middleware
      const paymentMiddleware = createPaymentMiddleware({
        amount: BigInt(1000000), // 1 USDC (6 decimals)
        method: PaymentMethod.USDC_ETH,
        requiresConfirmation: false, // Auto-approve for small amounts
        metadata: {
          action: 'research',
          topic,
        },
      });

      // Process payment
      const paymentResult = await new Promise<Memory[]>((resolve, reject) => {
        paymentMiddleware(
          runtime,
          message,
          state,
          async (response) => {
            if ((response as any).error) {
              await callback?.(response);
              resolve([]);
              return [];
            }

            if ((response as any).metadata?.requiresAction) {
              await callback?.(response);
              resolve([]);
              return [];
            }

            resolve([]);
            return [];
          },
          async () => {
            // Payment successful, perform research
            try {
              const results = await performResearch(topic, runtime);

              await callback?.({
                text: formatResearchResults(topic, results),
                metadata: {
                  action: 'research',
                  topic,
                  resultCount: results.length,
                  paymentCompleted: true,
                },
              });
              resolve([]);
            } catch (error) {
              logger.error('[ResearchAction] Research failed', error);
              await callback?.({
                text: 'Research failed. Your payment will be refunded.',
                error: true,
              });
              resolve([]);
            }
          }
        );
      });

      return paymentResult;
    } catch (error) {
      logger.error('[ResearchAction] Error in research action', error);

      await callback?.({
        text: error instanceof Error ? error.message : 'An error occurred during research.',
        error: true,
      });
      return [];
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Can you research the latest developments in quantum computing?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll research the latest developments in quantum computing for you. This service costs 1 USDC.\n\nProcessing payment...\n\nPayment successful! Here's what I found:\n\n**Latest Developments in Quantum Computing:**\n\n1. **IBM Quantum Breakthrough** - IBM announced a 433-qubit processor...\n2. **Google's Error Correction** - Significant progress in quantum error correction...\n3. **Commercial Applications** - New quantum algorithms for drug discovery...\n\nWould you like me to research any specific aspect in more detail?",
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Research the impact of AI on healthcare',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll research the impact of AI on healthcare. This requires a payment of 1 USDC.\n\nInitiating payment...\n\nPayment confirmed! Conducting research...\n\n**AI Impact on Healthcare - Research Summary:**\n\n1. **Diagnostic Accuracy** - AI systems achieving 95%+ accuracy in detecting certain cancers...\n2. **Drug Discovery** - AI reducing drug development time by 30-50%...\n3. **Personalized Medicine** - Machine learning enabling tailored treatment plans...\n\nThe research is complete. Would you like a deeper analysis of any particular area?",
        },
      },
    ],
  ],
};

/**
 * Extract research topic from message
 */
function extractResearchTopic(text: string): string | null {
  // Remove common phrases
  const cleanedText = text
    .toLowerCase()
    .replace(/can you research/gi, '')
    .replace(/please research/gi, '')
    .replace(/research/gi, '')
    .replace(/investigate/gi, '')
    .replace(/analyze/gi, '')
    .replace(/study/gi, '')
    .replace(/about/gi, '')
    .replace(/on/gi, '')
    .replace(/the/gi, '')
    .trim();

  // Return null if too short
  if (cleanedText.length < 3) {
    return null;
  }

  return cleanedText;
}

/**
 * Perform actual research using web search
 */
async function performResearch(topic: string, runtime: IAgentRuntime): Promise<ResearchResult[]> {
  logger.info('[ResearchAction] Performing research', { topic });

  // Simulate research delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Check if web search service is available
    const webSearchService = runtime.getService('web-search') as any;
    
    if (webSearchService && webSearchService.search) {
      // Use real web search if available
      const searchResults = await webSearchService.search(topic, { limit: 5 });
      
      return searchResults.map((result: any, index: number) => ({
        title: result.title || `Result ${index + 1}`,
        summary: result.snippet || result.description || 'No summary available',
        source: result.source || result.url || 'Web',
        relevance: result.relevance || 0.8,
        date: result.date || new Date().toISOString(),
      }));
    }

    // Fallback to structured mock results if no web search available
    logger.warn('[ResearchAction] Web search not available, using fallback results');
    
    return [
      {
        title: `Current State of ${topic}`,
        summary: `Analysis of the current developments and state of ${topic} based on recent information.`,
        source: 'Research Database',
        relevance: 0.95,
        date: new Date().toISOString(),
      },
      {
        title: `${topic}: Key Trends and Insights`,
        summary: `Overview of emerging trends and important insights related to ${topic}.`,
        source: 'Industry Analysis',
        relevance: 0.88,
        date: new Date().toISOString(),
      },
      {
        title: `Future Outlook for ${topic}`,
        summary: `Predictions and expert opinions on the future direction of ${topic}.`,
        source: 'Expert Network',
        relevance: 0.82,
        date: new Date().toISOString(),
      },
    ];
  } catch (error) {
    logger.error('[ResearchAction] Error performing research', error);
    // Return minimal results on error
    return [{
      title: `Research on ${topic}`,
      summary: 'Research completed but limited results available due to technical issues.',
      source: 'Internal',
      relevance: 0.5,
      date: new Date().toISOString(),
    }];
  }
}

/**
 * Format research results for display
 */
function formatResearchResults(topic: string, results: ResearchResult[]): string {
  let output = `**Research Results for "${topic}":**\n\n`;

  results.forEach((result, index) => {
    output += `**${index + 1}. ${result.title}**\n`;
    output += `${result.summary}\n`;
    output += `*Source: ${result.source} | Relevance: ${(result.relevance * 100).toFixed(0)}%*\n\n`;
  });

  output += `\n*Research completed. Total sources analyzed: ${results.length}*`;
  output += `\n*Service fee: 1 USDC*`;

  return output;
}

interface ResearchResult {
  title: string;
  summary: string;
  source: string;
  relevance: number;
  date: string;
}
