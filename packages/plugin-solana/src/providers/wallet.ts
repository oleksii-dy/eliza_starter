import { HandlerCallback, IAgentRuntime, Memory, Provider, State, logger } from '@elizaos/core';
import * as BigNumberJS from 'bignumber.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA_WALLET_DATA_CACHE_KEY } from '../constants';
import { getWalletKey } from '../keypairUtils';
import type { WalletPortfolio } from '../types';
import { PriceOracleService } from '../services/PriceOracleService';
import { TokenService } from '../services/TokenService';
import { SolanaService } from '../service';

const BigNumber = BigNumberJS.default || BigNumberJS;

// Define the ProviderResult interface if not already imported
/**
 * Represents the result returned by a provider.
 * @typedef {Object} ProviderResult
 * @property {any} [data] - The data associated with the result.
 * @property {Record<string, string>} [values] - The values stored in key-value pairs.
 * @property {string} [text] - The text content of the result.
 */
interface ProviderResult {
  data?: any;
  values?: Record<string, string>;
  text?: string;
}

/**
 * Wallet provider for Solana.
 * @param {IAgentRuntime} runtime - The agent runtime.
 * @param {Memory} _message - The memory message.
 * @param {State} [state] - Optional state parameter.
 * @returns {Promise<ProviderResult>} The result of the wallet provider.
 */
export const walletProvider: Provider = {
  name: 'solana-wallet',
  description:
    'Solana wallet balance, portfolio value, and holdings when agent needs to check wallet status or perform financial operations',
  // it's not slow we always have this data
  // but we don't always need this data, let's free up the context
  dynamic: true,
  get: async (runtime: IAgentRuntime, _message: Memory, state?: State): Promise<ProviderResult> => {
    try {
      const portfolioCache = await runtime.getCache<WalletPortfolio>(SOLANA_WALLET_DATA_CACHE_KEY);

      if (!portfolioCache) {
        logger.info('solana::wallet provider - portfolioCache is not ready');
        return { data: null, values: {}, text: '' };
      }

      const { publicKey } = await getWalletKey(runtime, false);
      const pubkeyStr = publicKey ? ` (${publicKey.toBase58()})` : '';

      // Get additional wallet info
      const connection = new Connection(
        runtime.getSetting('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
      );

      // Get SOL balance for gas estimation
      let solBalance = 0;
      let hasEnoughForFees = false;
      try {
        if (publicKey) {
          const balance = await connection.getBalance(publicKey);
          solBalance = balance / 1e9; // Convert lamports to SOL
          hasEnoughForFees = balance > 5000000; // 0.005 SOL minimum for fees
        }
      } catch (error) {
        logger.debug('Error fetching SOL balance:', error);
      }

      const portfolio = portfolioCache as WalletPortfolio;
      const agentName = state?.agentName || runtime.character.name || 'The agent';

      // Get TokenService to resolve token metadata
      const tokenService = runtime.getService<TokenService>('token-service');

      // Values that can be injected into templates
      const values: Record<string, string> = {
        total_usd: new BigNumber(portfolio.totalUsd).toFixed(2),
        total_sol: portfolio.totalSol?.toString() || '0',
        sol_balance: solBalance.toFixed(4),
        has_enough_for_fees: hasEnoughForFees.toString(),
        wallet_address: publicKey?.toBase58() || '',
      };

      // Add token balances to values
      portfolio.items.forEach((item, index) => {
        if (new BigNumber(item.uiAmount).isGreaterThan(0)) {
          values[`token_${index}_name`] = item.name;
          values[`token_${index}_symbol`] = item.symbol;
          values[`token_${index}_amount`] = new BigNumber(item.uiAmount).toFixed(6);
          values[`token_${index}_usd`] = new BigNumber(item.valueUsd).toFixed(2);
          values[`token_${index}_sol`] = item.valueSol?.toString() || '0';
        }
      });

      // Add market prices to values
      if (portfolio.prices) {
        values.sol_price = new BigNumber(portfolio.prices.solana.usd).toFixed(2);
        values.btc_price = new BigNumber(portfolio.prices.bitcoin.usd).toFixed(2);
        values.eth_price = new BigNumber(portfolio.prices.ethereum.usd).toFixed(2);
      }

      // Format the text output
      let text = `\n\n${agentName}'s Main Solana Wallet${pubkeyStr}\n`;
      text += `Total Value: $${values.total_usd} (${values.total_sol} SOL)\n`;
      text += `SOL Balance: ${values.sol_balance} SOL\n`;
      text += `Gas Fees Available: ${hasEnoughForFees ? 'Yes' : 'No (need at least 0.005 SOL)'}\n\n`;

      // Token Balances with proper metadata
      text += 'Token Balances:\n';
      const nonZeroItems = portfolio.items.filter((item) =>
        new BigNumber(item.uiAmount).isGreaterThan(0)
      );

      if (nonZeroItems.length === 0) {
        text += 'No tokens found with non-zero balance\n';
      } else {
        // If we have token service, enhance the display
        if (tokenService) {
          const mintAddresses = nonZeroItems.map((item) => item.address);
          const tokenInfoMap = await tokenService.getMultipleTokenInfo(mintAddresses);

          for (const item of nonZeroItems) {
            const tokenInfo = tokenInfoMap.get(item.address);
            const displayName = tokenInfo?.name || item.name;
            const displaySymbol = tokenInfo?.symbol || item.symbol;
            const valueUsd = new BigNumber(item.valueUsd).toFixed(2);

            text += `${displayName} (${displaySymbol}): ${new BigNumber(item.uiAmount).toFixed(
              6
            )} ($${valueUsd} | ${item.valueSol} SOL)\n`;
          }
        } else {
          // Fallback to original display
          for (const item of nonZeroItems) {
            const valueUsd = new BigNumber(item.valueUsd).toFixed(2);
            text += `${item.name} (${item.symbol}): ${new BigNumber(item.uiAmount).toFixed(
              6
            )} ($${valueUsd} | ${item.valueSol} SOL)\n`;
          }
        }
      }

      // Market Prices
      if (portfolio.prices) {
        text += '\nMarket Prices:\n';
        text += `SOL: $${values.sol_price}\n`;
        text += `BTC: $${values.btc_price}\n`;
        text += `ETH: $${values.eth_price}\n`;
      }

      return {
        data: portfolio,
        values,
        text,
      };
    } catch (error) {
      console.error('Error in Solana wallet provider:', error);
      return { data: null, values: {}, text: '' };
    }
  },
};
