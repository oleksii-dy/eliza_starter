import { coingeckoPlugin } from "@elizaos/plugin-coingecko";
import { SuiClient } from '@mysten/sui.js/client';
import { SocialAnalyzer, SocialMetrics } from '../utils/social';
import { Content as CoreContent, IAgentRuntime, State, Memory } from '@elizaos/core';
import { CoinGeckoResponse } from '../types/coingecko';
import { WalletConfig, SuiWalletConfig } from "./wallet-config";

interface CryptoAnalyzer {
  analyze(symbol: string): Promise<AnalysisResult>;
}

interface AnalysisResult {
  market: MarketData;
  social?: SocialMetrics;
  risk?: number;
  warnings?: string[];
}
export interface AuditResult {
  market: MarketData;
  risk: number;
  social: SocialMetrics;
  warnings: string[];
}

interface ContractData {
  address: string;
  owner: string;
  totalSupply: bigint;
  decimals: number;
}

interface MarketData {
  price: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
}

interface PriceContent extends CoreContent{
  text: string;
  prices?: {
    [symbol: string]: {
      usd: number;
      usd_market_cap: number;
      usd_24h_vol: number;
      usd_24h_change: number;
    }
  }
}

interface SuiCoinMetadata {
  dataType: "moveObject";
  fields: {
    decimals: number;
    supply: {
      fields: {
        value: string;
      };
    };
  };
}

function isSuiCoinMetadata(data: unknown): data is SuiCoinMetadata {
  if (!data || typeof data !== 'object') return false;
  
  const metadata = data as any;
  return (
    metadata.dataType === "moveObject" &&
    metadata.fields &&
    typeof metadata.fields.decimals === 'number' &&
    metadata.fields.supply?.fields?.value &&
    typeof metadata.fields.supply.fields.value === 'string'
  );
}

function isPriceContent(content: CoreContent): content is PriceContent {
  return (
    typeof content.text === 'string' &&
    'prices' in content &&
    content.prices !== null &&
    typeof content.prices === 'object'
  );
}

export class TokenAuditor implements CryptoAnalyzer {
  private suiClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
  private socialAnalyzer = new SocialAnalyzer();
  private walletConfig: WalletConfig;

  constructor(private runtime: IAgentRuntime) {
    // Initialize wallet config with runtime settings
    this.walletConfig = new SuiWalletConfig({
      'wallet.address': runtime.getSetting('wallet.address') ?? ''
    });
  }

  async analyze(symbol: string): Promise<AuditResult> {
    return this.auditToken(symbol);
  }

  async auditToken(symbol: string): Promise<AuditResult> {
    let marketData: MarketData = {
      price: 0,
      marketCap: 0,
      volume24h: 0,
      priceChange24h: 0
    };

    try {
      // Add null check for coingeckoPlugin and its actions
      if (!coingeckoPlugin.actions) {
        throw new Error('CoinGecko plugin not found');
      }
      // Use coingecko plugin's getPrice action
      const priceAction = coingeckoPlugin.actions.find(a => a.name === 'getPrice');
      if (!priceAction) {
        throw new Error('CoinGecko price action not found');
      }

      const message: Memory = {
        userId: '00000000-0000-0000-0000-000000000000',
        agentId: '00000000-0000-0000-0000-000000000000',
        roomId: '00000000-0000-0000-0000-000000000000',
        content: {
          text: `Get price for ${symbol}`,
          coinIds: symbol,
          currency: ["usd"],
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true
        }
      };

      const responses: Memory[] = [];
      const state = this.createState();
      await this.runtime.processActions(
        message,
        responses,
        state,
        async (response: CoreContent): Promise<Memory[]> => {
          if (!this.isCoinGeckoResponse(response)) {
            throw new Error('Invalid response format from CoinGecko');
          }

          const priceData = response.content.prices[symbol];
          if (!priceData) {
            throw new Error(`Price data for ${symbol} not found in CoinGecko response`);
          }

          marketData = {
            price: priceData.usd,
            marketCap: priceData.usd_market_cap,
            volume24h: priceData.usd_24h_vol,
            priceChange24h: priceData.usd_24h_change
          };
          return responses;
        }
      );

      // Get contract data and social sentiment
      const [contractData, sentiment] = await Promise.all([
        this.getSuiContract(symbol),
        this.socialAnalyzer.analyze(symbol)
      ]);

      return {
        market: marketData,
        risk: this.calculateRisk(marketData, contractData),
        social: sentiment,
        warnings: this.detectWarnings(contractData)
      };

    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to audit token: ${error.message}`);
      }
      throw new Error(`Failed to audit token: ${String(error)}`);
    }
  }

  private isCoinGeckoResponse(response: unknown): response is CoinGeckoResponse {
    if (!response || typeof response !== 'object') return false;
    const r = response as any;
    return (
      'content' in r &&
      typeof r.content === 'object' &&
      'prices' in r.content &&
      typeof r.content.prices === 'object'
    );
  }

  private calculateRisk(marketData: MarketData, contractData: ContractData): number {
    let riskScore = 50; // Start with neutral risk score

    // Market-based risk factors (0-25 points)
    const marketRisk = this.calculateMarketRisk(marketData);
    riskScore += marketRisk;

    // Contract-based risk factors (0-25 points)
    const contractRisk = this.calculateContractRisk(contractData);
    riskScore += contractRisk;

    // Ensure final score is between 0-100
    return Math.min(Math.max(riskScore, 0), 100);
  }

  private calculateMarketRisk(marketData: MarketData): number {
    let risk = 0;

    // Price volatility risk (up to 10 points)
    const priceChangeAbs = Math.abs(marketData.priceChange24h);
    if (priceChangeAbs > 50) risk += 10;
    else if (priceChangeAbs > 30) risk += 7;
    else if (priceChangeAbs > 20) risk += 5;
    else if (priceChangeAbs > 10) risk += 3;

    // Low market cap risk (up to 8 points)
    if (marketData.marketCap < 100000) risk += 8;
    else if (marketData.marketCap < 1000000) risk += 6;
    else if (marketData.marketCap < 10000000) risk += 4;
    else if (marketData.marketCap < 100000000) risk += 2;

    // Low volume risk (up to 7 points)
    const volumeToMarketCapRatio = marketData.volume24h / marketData.marketCap;
    if (volumeToMarketCapRatio < 0.01) risk += 7;
    else if (volumeToMarketCapRatio < 0.05) risk += 5;
    else if (volumeToMarketCapRatio < 0.1) risk += 3;

    return risk;
  }

  private calculateContractRisk(contractData: ContractData): number {
    let risk = 0;

    // Missing or invalid data risk (up to 10 points)
    if (!contractData.address || !contractData.owner) {
      risk += 10;
    }

    // Supply concentration risk (up to 8 points)
    const normalizedSupply = Number(contractData.totalSupply) / Math.pow(10, contractData.decimals);
    if (normalizedSupply === 0) {
      risk += 8;
    } else if (normalizedSupply > 1e12) {
      risk += 6; // Extremely large supply
    } else if (normalizedSupply < 1000) {
      risk += 4; // Very small supply
    }

    // Decimal places risk (up to 7 points)
    if (contractData.decimals === 0) {
      risk += 7; // Non-divisible token
    } else if (contractData.decimals > 18) {
      risk += 5; // Unusually high decimals
    } else if (contractData.decimals < 6) {
      risk += 3; // Unusually low decimals
    }

    return risk;
  }

  private detectWarnings(contractData: ContractData): string[] {
    const warnings: string[] = [];

    // Check if contract data is valid
    if (!contractData.address) {
      warnings.push('Contract address not found');
    }

    // Check for suspicious ownership patterns
    if (!contractData.owner) {
      warnings.push('Contract owner not found');
    } else if (contractData.owner === 'shared') {
      warnings.push('Contract has shared ownership - verify governance structure');
    }

    // Check supply characteristics
    if (contractData.totalSupply === BigInt(0)) {
      warnings.push('Zero total supply detected');
    } else {
      // Check for unusually large supply
      const normalizedSupply = Number(contractData.totalSupply) / Math.pow(10, contractData.decimals);
      if (normalizedSupply > 1e12) {
        warnings.push('Extremely large total supply - potential red flag');
      }
    }

    // Check decimals
    if (contractData.decimals === 0) {
      warnings.push('Non-divisible token detected');
    } else if (contractData.decimals > 18) {
      warnings.push('Unusually high number of decimals');
    }

    return warnings;
  }

  private async getSuiContract(symbol: string): Promise<ContractData> {
    try {
      // Use the wallet config instead of runtime directly
      const address = await this.walletConfig.getAddress();

      const coinsResponse = await this.suiClient.getCoins({
        owner: address,
        coinType: symbol
      });

      if (!coinsResponse.data || coinsResponse.data.length === 0) {
        throw new Error(`No coins found for symbol: ${symbol}`);
      }

      const coinObjectId = coinsResponse.data[0].coinObjectId;
      const objectData = await this.suiClient.getObject({
        id: coinObjectId,
        options: {
          showContent: true,
          showOwner: true
        }
      });

      if (!objectData.data?.content || !objectData.data.owner) {
        throw new Error('Invalid coin object data');
      }

      // Type guard for coin metadata
      if (!isSuiCoinMetadata(objectData.data.content)) {
        throw new Error('Invalid coin metadata format');
      }

      return {
        address: coinObjectId,
        owner: typeof objectData.data.owner === 'object' ? 'shared' : objectData.data.owner,
        totalSupply: BigInt(objectData.data.content.fields.supply.fields.value),
        decimals: objectData.data.content.fields.decimals
      };
    } catch (error) {
      console.error('Failed to fetch Sui contract:', error);
      return {
        address: '',
        owner: '',
        totalSupply: BigInt(0),
        decimals: 0
      };
    }
  }

  private createState(): State {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      agentId: '00000000-0000-0000-0000-000000000000',
      roomId: '00000000-0000-0000-0000-000000000000',
      bio: '',
      lore: '',
      messageDirections: '',
      postDirections: '',
      actors: '',
      recentMessages: '',
      recentMessagesData: [],
      timestamp: Date.now()
    };
  }
}


