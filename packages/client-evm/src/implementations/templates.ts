import { messageCompletionFooter } from "@ai16z/eliza";

/**
 * Response template for USDC/DAI swap events on Uniswap V3.
 * Provides context and formatting instructions for the agent response.
 * Includes swap-specific details like:
 * - Token amounts and direction
 * - Transaction hash
 * - Price impact and pool statistics
 */
export const usdcDaiTemplate = `# Task: Generate a conversational response about this USDC/DAI swap event for {{agentName}}.

About {{agentName}}:
{{bio}}
{{lore}}
{{topics}}
{{knowledge}}
{{messageExamples}}

Recent conversation history:
{{recentMessages}}

Event Information:
{{content.text}}

# Instructions:
- Keep responses short and focused on the key data
- Include amounts and transaction hash in each response
- Add a short personal comment based on conversational context
- Format example:
  Amount: 100 USDC ➜ 99.95 DAI
  Tx Hash: 0x123...
  *brief comment if relevant*
- Technical accuracy is crucial
` + messageCompletionFooter;