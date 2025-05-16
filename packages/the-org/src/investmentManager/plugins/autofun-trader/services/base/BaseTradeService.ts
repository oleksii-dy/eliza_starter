import { type IAgentRuntime } from '@elizaos/core';
import { DEFAULT_CONFIG } from '../../config/trading';
import { TradingConfig } from '../../types/trading';
import { AnalyticsService } from '../analyticsService';
import { DataService } from '../dataService';
import { WalletService } from '../walletService';

export abstract class BaseTradeService {
  protected tradingConfig: TradingConfig;

  constructor(
    protected runtime: IAgentRuntime,
    protected walletService: WalletService,
    protected dataService: DataService,
    protected analyticsService: AnalyticsService
  ) {
    this.tradingConfig = DEFAULT_CONFIG;
  }

  public getWalletService() {
    return this.walletService;
  }

  public getDataService() {
    return this.dataService;
  }

  public getAnalyticsService() {
    return this.analyticsService;
  }
}
