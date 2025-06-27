import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger
} from '@elizaos/core';

import {
  type LendingSupplyRequest,
  type LendingWithdrawRequest,
  type LendingBorrowRequest,
  type LendingRepayRequest,
  LendingProtocol,
  InterestRateMode,
  LendingActionType,
  MAINNET_CHAINS,
  COMMON_TOKENS,
  LendingError
} from '../types/index.js';
import type { LendingService } from '../services/LendingService.js';

export const lendingAction: Action = {
  name: 'LENDING_OPERATION',
  similes: [
    'SUPPLY_ASSETS',
    'WITHDRAW_ASSETS', 
    'BORROW_ASSETS',
    'REPAY_DEBT',
    'LEND_TOKENS',
    'DEFI_LENDING',
    'AAVE_OPERATION',
    'COMPOUND_OPERATION'
  ],
  description: 'Execute DeFi lending operations including supply, withdraw, borrow, and repay across protocols like Aave and Compound',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const lendingService = runtime.getService('lending');
    if (!lendingService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    
    // Lending operation keywords
    const lendingKeywords = [
      'supply', 'deposit', 'lend', 'provide liquidity',
      'withdraw', 'redeem', 'unstake',
      'borrow', 'loan', 'take loan',
      'repay', 'pay back', 'close position',
      'aave', 'compound', 'morpho', 'spark',
      'lending', 'borrowing', 'defi'
    ];

    const hasLendingKeyword = lendingKeywords.some(keyword => text.includes(keyword));

    // Asset keywords
    const assetKeywords = [
      'eth', 'usdc', 'usdt', 'dai', 'wbtc', 'weth',
      'matic', 'avax', 'link', 'aave', 'tokens'
    ];

    const hasAssetKeyword = assetKeywords.some(keyword => text.includes(keyword));

    // Amount patterns
    const hasAmount = /\d+(\.\d+)?\s*(eth|usdc|usdt|dai|wbtc|weth|matic|tokens?)/i.test(text);

    return hasLendingKeyword && (hasAssetKeyword || hasAmount);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    elizaLogger.info('🏦 Processing lending operation request...');

    try {
      const lendingService = runtime.getService('lending') as LendingService;
      if (!lendingService) {
        throw new LendingError('Lending service not available', 'SERVICE_UNAVAILABLE');
      }

      const text = message.content.text || '';
      const userAddress = lendingService.getWalletAddress();

      // Parse the lending request
      const lendingRequest = await parseLendingRequest(text, runtime, state || { values: {}, data: {}, text: '' });

      if (!lendingRequest) {
        if (callback) {
          await callback({
            text: `I need more information to process your lending request. Please specify:

**For Supply/Deposit:**
- "Supply 100 USDC to Aave on Ethereum"
- "Deposit 1 ETH on Polygon Aave"

**For Withdrawal:**
- "Withdraw 50 USDC from Aave"
- "Redeem all DAI from lending"

**For Borrowing:**
- "Borrow 500 USDT from Aave"
- "Take loan of 0.1 ETH variable rate"

**For Repayment:**
- "Repay 200 USDC to Aave"
- "Pay back all DAI debt"

Include the asset, amount, protocol (Aave/Compound), and chain when possible.`,
            thought: 'User did not provide sufficient lending parameters'
          });
        }
        return;
      }

      // Execute the appropriate lending operation
      let result;
      let actionDescription = '';

      switch (lendingRequest.action) {
        case LendingActionType.SUPPLY:
          result = await lendingService.supply(lendingRequest as LendingSupplyRequest);
          actionDescription = `supplied ${formatTokenAmount(lendingRequest.amount, lendingRequest.decimals)} ${lendingRequest.tokenSymbol}`;
          break;

        case LendingActionType.WITHDRAW:
          result = await lendingService.withdraw(lendingRequest as LendingWithdrawRequest);
          actionDescription = `withdrew ${formatTokenAmount(lendingRequest.amount, lendingRequest.decimals)} ${lendingRequest.tokenSymbol}`;
          break;

        case LendingActionType.BORROW:
          result = await lendingService.borrow(lendingRequest as LendingBorrowRequest);
          actionDescription = `borrowed ${formatTokenAmount(lendingRequest.amount, lendingRequest.decimals)} ${lendingRequest.tokenSymbol}`;
          break;

        case LendingActionType.REPAY:
          result = await lendingService.repay(lendingRequest as LendingRepayRequest);
          actionDescription = `repaid ${formatTokenAmount(lendingRequest.amount, lendingRequest.decimals)} ${lendingRequest.tokenSymbol}`;
          break;

        default:
          throw new LendingError(`Unsupported lending action: ${lendingRequest.action}`, 'UNSUPPORTED_ACTION');
      }

      if (callback) {
        await callback({
          text: `✅ Successfully ${actionDescription} via ${lendingRequest.protocol.toUpperCase()}!

**Transaction Details:**
- **Hash**: ${result.txHash}
- **Chain**: ${getChainName(result.chainId)}
- **Protocol**: ${result.protocol.toUpperCase()}
- **Asset**: ${result.asset.symbol}
- **Amount**: ${formatTokenAmount(result.amount, result.asset.decimals)} ${result.asset.symbol}
- **Gas Used**: ${result.gasUsed || 'Pending'}

You can track the transaction on the block explorer.`,
          thought: `Lending operation completed successfully: ${actionDescription}`
        });
      }

      // Store transaction in memory
      await runtime.createMemory({
        entityId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: `Lending transaction: ${result.txHash}`,
          metadata: {
            type: 'lending_transaction',
            action: result.action,
            protocol: result.protocol,
            txHash: result.txHash,
            chainId: result.chainId,
            asset: result.asset,
            amount: result.amount,
            timestamp: result.timestamp
          }
        }
      }, 'lending_transactions');

    } catch (error) {
      elizaLogger.error('Lending action failed:', error);
      
      let errorMessage = 'Failed to process lending request.';
      
      if (error instanceof LendingError) {
        switch (error.code) {
          case 'INSUFFICIENT_BALANCE':
            errorMessage = 'Insufficient balance for this operation.';
            break;
          case 'INSUFFICIENT_LIQUIDITY':
            errorMessage = `Insufficient liquidity in the protocol. Available: ${error.details?.available || 'unknown'}.`;
            break;
          case 'INSUFFICIENT_COLLATERAL':
            errorMessage = `Insufficient collateral. Health factor: ${error.details?.healthFactor || 'unknown'}. Minimum required: ${error.details?.minimumHealthFactor || '1.0'}.`;
            break;
          case 'UNSUPPORTED_PROTOCOL':
            errorMessage = `Protocol ${error.details?.protocol || 'unknown'} is not supported on this chain.`;
            break;
          case 'MARKET_NOT_ACTIVE':
            errorMessage = `Market for ${error.details?.asset || 'this asset'} is not active on ${error.details?.protocol || 'this protocol'}.`;
            break;
          case 'BORROWING_DISABLED':
            errorMessage = `Borrowing is disabled for ${error.details?.asset || 'this asset'} on ${error.details?.protocol || 'this protocol'}.`;
            break;
          case 'NO_SUPPLIED_BALANCE':
            errorMessage = 'You have no supplied balance to withdraw for this asset.';
            break;
          case 'NO_DEBT_TO_REPAY':
            errorMessage = 'You have no debt to repay for this asset.';
            break;
          default:
            errorMessage = error.message;
        }
      }

      if (callback) {
        await callback({
          text: `❌ ${errorMessage}`,
          thought: 'Lending request failed with error'
        });
      }
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Supply 100 USDC to Aave on Ethereum'
        }
      },
      {
        name: 'assistant',
        content: {
          text: "I'll help you supply 100 USDC to Aave on Ethereum. Let me process this lending operation...",
          actions: ['LENDING_OPERATION']
        }
      }
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Borrow 50 DAI from Aave variable rate'
        }
      },
      {
        name: 'assistant',
        content: {
          text: "I'll help you borrow 50 DAI from Aave at variable rate. Checking your collateral and executing...",
          actions: ['LENDING_OPERATION']
        }
      }
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Withdraw 0.5 ETH from my Aave deposit'
        }
      },
      {
        name: 'assistant',
        content: {
          text: "I'll withdraw 0.5 ETH from your Aave deposit. Checking health factor and processing...",
          actions: ['LENDING_OPERATION']
        }
      }
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Repay all my USDT debt on Aave'
        }
      },
      {
        name: 'assistant',
        content: {
          text: "I'll repay all your USDT debt on Aave. Calculating total amount and executing repayment...",
          actions: ['LENDING_OPERATION']
        }
      }
    ]
  ]
};

// Helper function to parse lending requests from natural language
async function parseLendingRequest(text: string, runtime: IAgentRuntime, state: State): Promise<any> {
  const lowerText = text.toLowerCase();

  // Determine the action type
  let action: LendingActionType;
  if (lowerText.includes('supply') || lowerText.includes('deposit') || lowerText.includes('lend') || lowerText.includes('provide')) {
    action = LendingActionType.SUPPLY;
  } else if (lowerText.includes('withdraw') || lowerText.includes('redeem') || lowerText.includes('unstake')) {
    action = LendingActionType.WITHDRAW;
  } else if (lowerText.includes('borrow') || lowerText.includes('loan') || lowerText.includes('take loan')) {
    action = LendingActionType.BORROW;
  } else if (lowerText.includes('repay') || lowerText.includes('pay back') || lowerText.includes('close')) {
    action = LendingActionType.REPAY;
  } else {
    return null;
  }

  // Extract amount and token
  const amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*([a-z]+)/i);
  if (!amountMatch && !lowerText.includes('all') && !lowerText.includes('max')) {
    return null;
  }

  let amount: string;
  let tokenSymbol: string;
  let decimals: number;

  if (amountMatch) {
    amount = amountMatch[1];
    tokenSymbol = amountMatch[2].toUpperCase();
  } else {
    // Handle "all" or "max" cases
    amount = 'max';
    // Try to extract token from context
    const tokenMatch = lowerText.match(/(?:all|max)\s+(?:of\s+)?([a-z]+)/i) ||
                      lowerText.match(/([a-z]+)\s+(?:debt|position|balance)/i);
    tokenSymbol = tokenMatch ? tokenMatch[1].toUpperCase() : 'USDC'; // Default to USDC
  }

  // Map token symbols to addresses and decimals
  const tokenAddresses: { [key: string]: { address: string; decimals: number } } = {
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    USDC: { address: '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  };

  const tokenInfo = tokenAddresses[tokenSymbol];
  if (!tokenInfo) {
    return null;
  }

  decimals = tokenInfo.decimals;
  const asset = tokenInfo.address;

  // Determine protocol
  let protocol = LendingProtocol.AAVE; // Default to Aave
  if (lowerText.includes('compound')) {
    protocol = LendingProtocol.COMPOUND;
  } else if (lowerText.includes('morpho')) {
    protocol = LendingProtocol.MORPHO;
  } else if (lowerText.includes('spark')) {
    protocol = LendingProtocol.SPARK;
  }

  // Determine chain
  let chainId = MAINNET_CHAINS.ETHEREUM; // Default to Ethereum
  if (lowerText.includes('polygon') || lowerText.includes('matic')) {
    chainId = MAINNET_CHAINS.POLYGON;
  } else if (lowerText.includes('arbitrum') || lowerText.includes('arb')) {
    chainId = MAINNET_CHAINS.ARBITRUM;
  } else if (lowerText.includes('optimism') || lowerText.includes('op')) {
    chainId = MAINNET_CHAINS.OPTIMISM;
  } else if (lowerText.includes('base')) {
    chainId = MAINNET_CHAINS.BASE;
  }

  // Determine interest rate mode for borrowing
  let interestRateMode = InterestRateMode.VARIABLE;
  if (lowerText.includes('stable') || lowerText.includes('fixed')) {
    interestRateMode = InterestRateMode.STABLE;
  }

  // Convert amount to smallest unit
  let amountInSmallestUnit: string;
  if (amount === 'max' || amount === 'all') {
    amountInSmallestUnit = 'max';
  } else {
    amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toString();
  }

  // Get user address
  const lendingService = runtime.getService('lending') as LendingService;
  const userAddress = lendingService.getWalletAddress();

  // Build the appropriate request object
  const baseRequest = {
    protocol,
    chainId,
    asset,
    amount: amountInSmallestUnit,
    userAddress,
    tokenSymbol,
    decimals,
    action
  };

  switch (action) {
    case LendingActionType.SUPPLY:
      return {
        ...baseRequest,
        enableCollateral: !lowerText.includes('no collateral') && !lowerText.includes('not collateral')
      };

    case LendingActionType.WITHDRAW:
      return baseRequest;

    case LendingActionType.BORROW:
      return {
        ...baseRequest,
        interestRateMode
      };

    case LendingActionType.REPAY:
      return {
        ...baseRequest,
        interestRateMode
      };

    default:
      return baseRequest;
  }
}

// Helper functions
function getChainName(chainId: number): string {
  const chainNames: { [key: number]: string } = {
    [MAINNET_CHAINS.ETHEREUM]: 'Ethereum',
    [MAINNET_CHAINS.POLYGON]: 'Polygon',
    [MAINNET_CHAINS.ARBITRUM]: 'Arbitrum',
    [MAINNET_CHAINS.OPTIMISM]: 'Optimism',
    [MAINNET_CHAINS.BASE]: 'Base'
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}

function formatTokenAmount(amount: string, decimals: number): string {
  if (amount === 'max' || amount === 'all') {
    return 'MAX';
  }

  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;

    if (remainder === 0n) {
      return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    if (trimmedRemainder === '') {
      return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
  } catch (error) {
    return '0';
  }
}