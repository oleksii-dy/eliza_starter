import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  type ActionExample,
} from '@elizaos/core';

import type { AgentKitService } from './services/AgentKitService';

/**
 * Comprehensive examples for AgentKit actions showing real-world usage patterns
 * and action chaining scenarios
 */
const AGENTKIT_ACTION_EXAMPLES: Record<string, ActionExample[][]> = {
  // Wallet Operations
  get_balance: [
    [
      {
        name: '{{user}}',
        content: {
          text: "What's my wallet balance?",
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check your wallet balance for you.",
          thought: "User wants to check their wallet balance. I'll use the get_balance action.",
          actions: ['GET_BALANCE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Check my ETH and USDC balances on Base',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check both your ETH and USDC balances on the Base network.",
          thought: "User wants to check specific token balances. I'll check ETH first, then USDC.",
          actions: ['GET_BALANCE'],
        },
      },
    ],
    // Action chaining scenario
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to lend some money on Compound, but first check if I have enough USDC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check your USDC balance first, then help you with Compound lending.",
          thought:
            'User wants to lend on Compound but needs balance check first. This is a perfect action chain scenario.',
          actions: ['GET_BALANCE'],
        },
      },
    ],
  ],
  transfer: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f6FD70',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer 0.1 ETH to that address for you.",
          thought: 'User wants to transfer ETH. I have the amount and recipient address.',
          actions: ['TRANSFER'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer 100 USDC to alice.base.eth',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll send 100 USDC to alice.base.eth for you.",
          thought: "User wants to transfer USDC to a Base domain name. I'll handle the transfer.",
          actions: ['TRANSFER'],
        },
      },
    ],
    // Action chaining: Balance check then transfer
    [
      {
        name: '{{user}}',
        content: {
          text: 'Send half of my USDC to my friend at 0x1234567890abcdef1234567890abcdef12345678',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check your USDC balance first, then send half to your friend.",
          thought:
            'User wants to send half their USDC. I need to check balance first, calculate half, then transfer.',
          actions: ['GET_BALANCE'],
        },
      },
    ],
  ],
  // DeFi Operations
  cdp_compound_supply: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to supply 1000 USDC to Compound',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll supply 1000 USDC to Compound for you to start earning interest.",
          thought:
            'User wants to supply USDC to Compound for lending. This is a straightforward supply operation.',
          actions: ['CDP_COMPOUND_SUPPLY'],
        },
      },
    ],
    // Action chaining: Check balance, then supply
    [
      {
        name: '{{user}}',
        content: {
          text: 'Supply all my USDC to Compound to earn yield',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check your USDC balance first, then supply it all to Compound for yield generation.",
          thought:
            'User wants to supply all USDC. I need to check balance first to know the amount, then supply.',
          actions: ['GET_BALANCE'],
        },
      },
    ],
  ],
  cdp_compound_borrow: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Borrow 500 USDC from Compound',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll borrow 500 USDC from Compound for you.",
          thought: "User wants to borrow USDC from Compound. I'll execute the borrow action.",
          actions: ['CDP_COMPOUND_BORROW'],
        },
      },
    ],
    // Complex action chaining: Supply collateral, then borrow
    [
      {
        name: '{{user}}',
        content: {
          text: 'I want to leverage my position: supply my ETH as collateral and borrow USDC against it',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll help you leverage your position by first supplying your ETH as collateral, then borrowing USDC against it.",
          thought:
            'User wants to create a leveraged position. First supply ETH, then borrow USDC. This is a multi-step DeFi strategy.',
          actions: ['CDP_COMPOUND_SUPPLY'],
        },
      },
    ],
  ],
  // Token Operations
  cdp_wrap_eth: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Wrap 2 ETH into WETH',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll wrap 2 ETH into WETH for you.",
          thought: 'User wants to wrap ETH into WETH. This is needed for many DeFi operations.',
          actions: ['CDP_WRAP_ETH'],
        },
      },
    ],
    // Action chaining: Wrap then use for DeFi
    [
      {
        name: '{{user}}',
        content: {
          text: 'Wrap my ETH and then supply it to Compound for lending',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll wrap your ETH into WETH first, then supply it to Compound for lending.",
          thought:
            'User wants to wrap ETH then use it for DeFi. I need to wrap first, then supply to Compound.',
          actions: ['CDP_WRAP_ETH'],
        },
      },
    ],
  ],
  // Trading and Swaps
  cdp_trade: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Swap 100 USDC for ETH',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll swap 100 USDC for ETH for you.",
          thought: "User wants to swap USDC for ETH. I'll execute the trade.",
          actions: ['CDP_TRADE'],
        },
      },
    ],
    // Complex trading strategy
    [
      {
        name: '{{user}}',
        content: {
          text: 'I think ETH will go up. Swap my USDC for ETH, then supply the ETH to earn yield',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll execute your strategy: swap USDC for ETH first, then supply the ETH to earn yield.",
          thought:
            'User has a two-step strategy: trade USDC to ETH, then supply ETH for yield. This requires action chaining.',
          actions: ['CDP_TRADE'],
        },
      },
    ],
  ],
  // Social Media Integration
  post_tweet: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Tweet about my successful DeFi transaction',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll post a tweet about your DeFi success for you.",
          thought:
            "User wants to share their DeFi achievement on Twitter. I'll compose and post a tweet.",
          actions: ['POST_TWEET'],
        },
      },
    ],
    // Action chaining: Execute transaction then tweet about it
    [
      {
        name: '{{user}}',
        content: {
          text: 'Supply my USDC to Compound and then tweet about starting my DeFi journey',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll supply your USDC to Compound first, then tweet about your DeFi journey milestone.",
          thought:
            'User wants to do DeFi action and share it socially. Supply to Compound first, then post tweet.',
          actions: ['CDP_COMPOUND_SUPPLY'],
        },
      },
    ],
  ],
  // NFT Operations
  cdp_mint_nft: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create an NFT of my trading success',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll mint an NFT to commemorate your trading success.",
          thought: "User wants to create an NFT. I'll mint one for them.",
          actions: ['CDP_MINT_NFT'],
        },
      },
    ],
  ],
  // Data and Price Feeds
  pyth_fetch_price: [
    [
      {
        name: '{{user}}',
        content: {
          text: "What's the current price of ETH?",
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll get the current ETH price for you.",
          thought: "User wants current ETH price. I'll fetch it from Pyth price feeds.",
          actions: ['PYTH_FETCH_PRICE'],
        },
      },
    ],
    // Action chaining: Check price then make decision
    [
      {
        name: '{{user}}',
        content: {
          text: "Check ETH price, and if it's under $3000, swap my USDC for ETH",
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll check the current ETH price first, then execute the swap if it's under $3000.",
          thought:
            'User wants conditional trading based on price. Check price first, then potentially execute trade.',
          actions: ['PYTH_FETCH_PRICE'],
        },
      },
    ],
  ],
  // Cross-chain Operations
  cdp_across_bridge: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge 100 USDC from Ethereum to Base',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge 100 USDC from Ethereum to Base for you.",
          thought: "User wants to bridge USDC cross-chain. I'll use the Across bridge.",
          actions: ['CDP_ACROSS_BRIDGE'],
        },
      },
    ],
    // Complex cross-chain strategy
    [
      {
        name: '{{user}}',
        content: {
          text: 'Bridge my USDC to Base and then supply it to Compound on Base for better yields',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll bridge your USDC to Base first, then supply it to Compound on Base for better yields.",
          thought:
            'User wants cross-chain yield farming. Bridge to Base first, then supply to Compound there.',
          actions: ['CDP_ACROSS_BRIDGE'],
        },
      },
    ],
  ],
  // Farcaster Social
  post_cast: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Post on Farcaster about my DeFi portfolio',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a Farcaster post about your DeFi portfolio.",
          thought: "User wants to share DeFi portfolio on Farcaster. I'll compose and post a cast.",
          actions: ['POST_CAST'],
        },
      },
    ],
  ],
  // General inferred actions
  portfolio_analysis: [
    [
      {
        name: '{{user}}',
        content: {
          text: "How's my DeFi portfolio doing?",
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll analyze your DeFi portfolio by checking your positions across different protocols.",
          thought:
            'User wants portfolio analysis. I need to check balances, Compound positions, and calculate overall performance.',
          actions: ['GET_BALANCE', 'CDP_COMPOUND_GET_PORTFOLIO'],
        },
      },
    ],
  ],
};

/**
 * Get all AgentKit actions dynamically from the CdpToolkit
 */
export function _getAgentKitActions(): Action[] {
  // Return empty array - actions will be registered dynamically
  return [];
}

/**
 * Create AgentKit actions from the service
 */
export async function createAgentKitActionsFromService(runtime: IAgentRuntime): Promise<Action[]> {
  const agentKitService = runtime.getService<AgentKitService>('agentkit');

  if (!agentKitService || !agentKitService.isReady()) {
    console.warn('[AgentKit] Service not available, skipping action creation');
    return [];
  }

  const agentKit = agentKitService.getAgentKit();
  const agentKitActions = agentKit.getActions();

  const actions = agentKitActions
    .filter(
      (action) =>
        typeof (action as AgentKitAction & { description?: string }).description === 'string'
    )
    .map((agentKitAction) => {
      const actionWithDesc = agentKitAction as AgentKitAction & { description: string };
      const actionName = actionWithDesc.name.toUpperCase();
      const examples = getExamplesForAction(actionWithDesc.name, actionName);

      return {
        name: actionName,
        description: actionWithDesc.description,
        similes: generateSimiles(actionWithDesc.name),
        validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
          // Enhanced validation based on message content and context
          const agentKitService = runtime.getService<AgentKitService>('agentkit');
          if (!agentKitService || !agentKitService.isReady()) {
            return false;
          }

          const messageText = message.content.text?.toLowerCase() || '';
          const actionKeywords = getActionKeywords(actionWithDesc.name);

          // Check if message contains relevant keywords or if action is explicitly requested
          return (
            actionKeywords.some((keyword) => messageText.includes(keyword)) ||
            message.content.actions?.includes(actionName) ||
            message.content.actions?.includes(actionWithDesc.name) ||
            hasContextualRelevance(messageText, actionWithDesc.name)
          );
        },
        handler: async (
          runtime: IAgentRuntime,
          message: Memory,
          state: State | undefined,
          _options?: Record<string, unknown>,
          callback?: HandlerCallback
        ): Promise<ActionResult> => {
          try {
            const agentKitService = runtime.getService<AgentKitService>('agentkit');
            if (!agentKitService || !agentKitService.isReady()) {
              throw new Error('AgentKit service not available');
            }

            const currentState = state ?? (await runtime.composeState(message));

            // Extract parameters from message using enhanced approach
            const messageText = message.content.text || '';
            const parameters = await extractParametersFromMessage(
              actionWithDesc,
              messageText,
              currentState
            );

            const result = await executeToolAction(
              actionWithDesc,
              parameters,
              agentKitService.getAgentKit() as AgentKitInstance
            );

            // Generate response
            const response = generateActionResponse(actionWithDesc, result);

            callback?.({ text: response, content: result });
            return {
              text: response,
              data: {
                success: true,
                result,
                toolName: actionWithDesc.name,
                timestamp: Date.now(),
                chainId: await getChainContext(agentKitService),
                actionType: categorizeAction(actionWithDesc.name),
              },
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorText = `Error executing action ${actionWithDesc.name}: ${errorMessage}`;
            callback?.({
              text: errorText,
              content: { error: errorMessage },
            });
            return {
              text: errorText,
              data: {
                success: false,
                error: errorMessage,
                toolName: actionWithDesc.name,
                timestamp: Date.now(),
                actionType: categorizeAction(actionWithDesc.name),
              },
            };
          }
        },
        examples,
      };
    });
  return actions;
}

// AgentKit tool action interface
interface AgentKitAction {
  name: string;
  invoke: (parameters: unknown) => Promise<unknown>;
  schema?: {
    _def?: {
      shape?: () => Record<string, unknown>;
    };
    safeParse?: (data: unknown) => {
      success: boolean;
      data?: unknown;
    };
  };
}

interface AgentKitInstance {
  getActions: () => AgentKitAction[];
}

/**
 * Execute a tool action with proper error handling and context
 */
async function executeToolAction(
  action: AgentKitAction,
  parameters: unknown,
  _agentKit: AgentKitInstance
): Promise<unknown> {
  try {
    // Use the action's invoke method with the parameters
    const result = await action.invoke(parameters);
    return result;
  } catch (error) {
    console.error(`[AgentKit] Error executing action ${action.name}:`, error);
    throw error;
  }
}

/**
 * Enhanced parameter extraction based on tool requirements and context
 */
async function extractParametersFromMessage(
  action: AgentKitAction,
  messageText: string,
  _state?: State
): Promise<unknown> {
  const params: Record<string, unknown> = {};
  const actionName = action.name.toLowerCase();

  // Extract parameters based on the action's schema
  try {
    // The new SDK uses Zod schemas, so we need to parse differently
    const schema = action.schema;
    if (schema && schema._def) {
      // For Zod schemas, we need to extract parameters from the message
      const _schemaShape = schema._def?.shape?.() || {};

      // Enhanced parameter extraction based on action type
      const enhancedParams = enhanceParametersForTool(actionName, params, messageText, _state);

      // Try to parse with the schema
      if (schema.safeParse) {
        const parsed = schema.safeParse(enhancedParams);
        if (parsed.success) {
          return parsed.data;
        }
      }
    }
  } catch (error) {
    console.warn(`[AgentKit] Could not parse parameters for ${actionName}:`, error);
  }

  // Fallback to enhanced parameters
  return enhanceParametersForTool(actionName, params, messageText, _state);
}

/**
 * Generate response based on tool result
 */
function generateActionResponse(action: AgentKitAction, result: unknown): string {
  const _actionName = action.name.toLowerCase();

  if (typeof result === 'string') {
    return result;
  }

  if (typeof result === 'object' && result !== null) {
    // Handle different result types based on action
    const resultRecord = result as Record<string, unknown>;
    if (resultRecord.hash || resultRecord.txHash || resultRecord.transactionHash) {
      const hash = resultRecord.hash || resultRecord.txHash || resultRecord.transactionHash;
      return `Transaction completed successfully! Hash: ${hash}`;
    }

    if (resultRecord.address) {
      return `Operation completed successfully! Address: ${resultRecord.address}`;
    }

    if (resultRecord.balance !== undefined) {
      return `Balance: ${resultRecord.balance}`;
    }

    if (resultRecord.price !== undefined) {
      return `Price: ${resultRecord.price}`;
    }
  }

  return `${action.name} completed successfully!`;
}

/**
 * Get examples for a specific action based on its name
 */
function getExamplesForAction(toolName: string, actionName: string): ActionExample[][] {
  // Try exact tool name match first
  if (AGENTKIT_ACTION_EXAMPLES[toolName]) {
    return AGENTKIT_ACTION_EXAMPLES[toolName];
  }

  // Try action name match
  if (AGENTKIT_ACTION_EXAMPLES[actionName.toLowerCase()]) {
    return AGENTKIT_ACTION_EXAMPLES[actionName.toLowerCase()];
  }

  // Try partial matches for common patterns
  const lowerToolName = toolName.toLowerCase();
  for (const [key, examples] of Object.entries(AGENTKIT_ACTION_EXAMPLES)) {
    if (lowerToolName.includes(key) || key.includes(lowerToolName)) {
      return examples;
    }
  }

  // Return generic examples for unknown actions
  return [
    [
      {
        name: '{{user}}',
        content: {
          text: `Execute ${toolName} action`,
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: `I'll execute the ${toolName} action for you.`,
          thought: `User wants to use ${toolName}. I'll help them with this action.`,
          actions: [actionName],
        },
      },
    ],
  ];
}

/**
 * Generate similes (alternative names) for actions
 */
function generateSimiles(toolName: string): string[] {
  const simileMap: Record<string, string[]> = {
    get_balance: ['CHECK_BALANCE', 'WALLET_BALANCE', 'SHOW_BALANCE'],
    transfer: ['SEND', 'SEND_TOKENS', 'TRANSFER_TOKENS', 'PAY'],
    cdp_trade: ['SWAP', 'EXCHANGE', 'TRADE_TOKENS', 'CONVERT'],
    cdp_compound_supply: ['LEND', 'SUPPLY_TOKENS', 'DEPOSIT', 'PROVIDE_LIQUIDITY'],
    cdp_compound_borrow: ['BORROW_TOKENS', 'TAKE_LOAN', 'LEVERAGE'],
    cdp_wrap_eth: ['WRAP', 'WRAP_ETHEREUM', 'CONVERT_ETH'],
    post_tweet: ['TWEET', 'POST_TWITTER', 'SHARE_TWITTER'],
    post_cast: ['FARCASTER_POST', 'CAST', 'SHARE_FARCASTER'],
    pyth_fetch_price: ['GET_PRICE', 'CHECK_PRICE', 'PRICE_FEED'],
    cdp_mint_nft: ['CREATE_NFT', 'MINT_TOKEN', 'GENERATE_NFT'],
  };

  return simileMap[toolName] || [];
}

/**
 * Get relevant keywords for action detection
 */
function getActionKeywords(toolName: string): string[] {
  const keywordMap: Record<string, string[]> = {
    get_balance: ['balance', 'how much', 'check wallet', 'funds', 'money'],
    transfer: ['send', 'transfer', 'pay', 'give', 'move'],
    cdp_trade: ['swap', 'trade', 'exchange', 'convert', 'buy', 'sell'],
    cdp_compound_supply: ['supply', 'lend', 'deposit', 'earn yield', 'compound'],
    cdp_compound_borrow: ['borrow', 'loan', 'leverage', 'take out'],
    cdp_wrap_eth: ['wrap', 'weth', 'wrapped ethereum'],
    post_tweet: ['tweet', 'twitter', 'post', 'share'],
    post_cast: ['farcaster', 'cast', 'post on farcaster'],
    pyth_fetch_price: ['price', 'cost', 'value', 'worth', 'market'],
    cdp_mint_nft: ['nft', 'mint', 'create token', 'digital art'],
    cdp_across_bridge: ['bridge', 'cross-chain', 'move to', 'transfer to'],
  };

  return keywordMap[toolName] || [];
}

/**
 * Check if message has contextual relevance to the action
 */
function hasContextualRelevance(messageText: string, toolName: string): boolean {
  const contextMap: Record<string, string[]> = {
    get_balance: ['portfolio', 'net worth', 'assets', 'holdings'],
    cdp_compound_supply: ['defi', 'yield', 'interest', 'earn', 'invest'],
    cdp_compound_borrow: ['leverage', 'margin', 'credit', 'liquidity'],
    pyth_fetch_price: ['market', 'trading', 'analysis', 'chart'],
    post_tweet: ['announce', 'share', 'social', 'public'],
    cdp_across_bridge: ['mainnet', 'layer 2', 'ethereum', 'base', 'arbitrum'],
  };

  const contexts = contextMap[toolName] || [];
  return contexts.some((context) => messageText.includes(context));
}

/**
 * Enhance parameters for specific tools based on context
 */
function enhanceParametersForTool(
  toolName: string,
  params: Record<string, unknown>,
  messageText: string,
  _state?: State
): Record<string, unknown> {
  const enhanced = { ...params };
  const lowerMessage = messageText.toLowerCase();

  switch (toolName) {
    case 'transfer': {
      // Extract amount and recipient for transfers
      const amountMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(eth|usdc|btc|sol)/i);
      if (amountMatch) {
        enhanced.amount = amountMatch[1];
        enhanced.asset_id = amountMatch[2].toUpperCase();
      }

      const addressMatch = messageText.match(
        /(0x[a-fA-F0-9]{40}|[a-zA-Z0-9.-]+\.eth|[a-zA-Z0-9.-]+\.base\.eth)/i
      );
      if (addressMatch) {
        enhanced.destination = addressMatch[1];
      }
      break;
    }

    case 'cdp_compound_supply':
    case 'cdp_compound_borrow': {
      // Extract amount for DeFi operations
      const defiAmountMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(usdc|eth|weth|btc)/i);
      if (defiAmountMatch) {
        enhanced.amount = defiAmountMatch[1];
        enhanced.asset_id = defiAmountMatch[2].toUpperCase();
      }
      break;
    }

    case 'pyth_fetch_price': {
      // Extract asset for price fetching
      const assetMatch = lowerMessage.match(/(eth|btc|usdc|sol|matic|avax|dot|ada)/i);
      if (assetMatch) {
        enhanced.asset_id = assetMatch[1].toUpperCase();
      }
      break;
    }

    case 'post_tweet':
    case 'post_cast': {
      // Use the message content as the post content
      if (!enhanced.content && !enhanced.text) {
        enhanced.content = messageText.replace(/tweet|post|share/gi, '').trim();
      }
      break;
    }
  }

  return enhanced;
}

/**
 * Get chain context for metadata
 */
async function getChainContext(_agentKitService: AgentKitService): Promise<string | undefined> {
  // Note: Network ID is not directly accessible from AgentKit instance
  // It would need to be accessed through wallet provider if needed
  return 'base-sepolia'; // Default network for testing
}

/**
 * Categorize action for better organization
 */
function categorizeAction(toolName: string): string {
  if (toolName.includes('balance') || toolName.includes('transfer')) {
    return 'wallet';
  }
  if (toolName.includes('compound') || toolName.includes('supply') || toolName.includes('borrow')) {
    return 'defi';
  }
  if (toolName.includes('trade') || toolName.includes('swap')) {
    return 'trading';
  }
  if (toolName.includes('tweet') || toolName.includes('cast')) {
    return 'social';
  }
  if (toolName.includes('nft') || toolName.includes('mint')) {
    return 'nft';
  }
  if (toolName.includes('price') || toolName.includes('pyth')) {
    return 'data';
  }
  if (toolName.includes('bridge') || toolName.includes('across')) {
    return 'bridge';
  }
  return 'other';
}
